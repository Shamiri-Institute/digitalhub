// @vitest-environment node
// The print job against the database and a local S3 server (scripts/local-s3.sh locally, SeaweedFS
// in CI): what it puts in S3, and how it recovers from a worker that died. The run page's progress
// and the download are tested through the UI in tests/e2e/hub-coordinator/print-runs.spec.ts.
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool } from "#/db/client";
import {
  hub,
  project,
  school,
  surveyPrintFile,
  surveyQuestionnaire,
  surveyQuestionnairePage,
} from "#/db/schema";
import type { HubSurveyScope } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import { getS3Client } from "#/lib/s3/s3.service";
import { getBucket } from "#/lib/s3/s3.config";
import { drainPrintQueue, printFileKey, retryFailedPrintFiles } from "#/lib/survey/print-files";
import { pageIdFromQrText } from "#/lib/survey/print-qr";
import { issuePrintFile, recordPrintRun, voidCopy } from "#/lib/survey/print-run";
import { decodedQrCodes } from "#/tests/print-pdf";
import { createPublishedSurvey, formWithPages, removeSurvey } from "#/tests/survey-fixtures";

let scope: HubSurveyScope;
let testSchoolId: string;
const createdCodes: string[] = [];

beforeAll(async () => {
  const [found] = await db
    .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
    .orderBy(asc(hub.id))
    .limit(1);
  const member = found
    ? await db.query.implementerMember.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.implementerId, found.implementerId), eq(m.role, "ADMIN")),
        orderBy: (m, { asc }) => asc(m.id),
      })
    : undefined;
  if (!found || !member) throw new Error("Seed the database first");
  scope = { ...found, userId: member.userId };
  testSchoolId = objectId("school");
  await db.insert(school).values({
    id: testSchoolId,
    schoolName: `Print file test school ${testSchoolId}`,
    visibleId: testSchoolId,
    hubId: scope.hubId,
  });
});

afterAll(async () => {
  for (const code of createdCodes) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- a few surveys, one at a time
    await removeSurvey({ code });
  }
  await db.delete(school).where(eq(school.id, testSchoolId));
  await pool.end();
});

/** A run of `copies` blank copies of a new two-page version, recorded but not yet printed. */
async function recordRun(copies: number) {
  const code = `F${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  createdCodes.push(code);
  const published = await createPublishedSurvey({
    code,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    prefill: "NONE",
    form: formWithPages(2),
  });
  return db.transaction((tx) =>
    recordPrintRun(tx, scope, {
      printRunId: objectId("surveyprintrun"),
      versionId: published.versionId,
      request: { kind: "COUNTS", schools: [{ schoolId: testSchoolId, copies }] },
    }),
  );
}

async function fileOf(printRunId: string) {
  const [file] = await db
    .select()
    .from(surveyPrintFile)
    .where(eq(surveyPrintFile.printRunId, printRunId));
  if (!file) throw new Error("No file");
  return file;
}

async function storedPdf(file: { id: string; printRunId: string }) {
  const stored = await getS3Client("survey-print-files").send(
    new GetObjectCommand({
      Bucket: getBucket("survey-print-files").bucket,
      Key: printFileKey(file),
    }),
  );
  if (!stored.Body) throw new Error("Empty object");
  return new Uint8Array(await stored.Body.transformToByteArray());
}

describe("the print job", () => {
  it("puts a run of 10 in S3 with every page's id in a QR code exactly once", async () => {
    const recorded = await recordRun(10);

    expect(await drainPrintQueue({ printRunId: recorded.printRunId })).toEqual({
      ready: 1,
      failed: 0,
      retrying: 0,
    });
    const file = await fileOf(recorded.printRunId);
    expect(file).toMatchObject({ status: "READY", attempts: 1, error: null });
    const pdf = await storedPdf(file);
    expect(file.byteSize).toBe(pdf.length);

    const pageIds = await db
      .select({ id: surveyQuestionnairePage.id })
      .from(surveyQuestionnairePage)
      .innerJoin(
        surveyQuestionnaire,
        eq(surveyQuestionnaire.id, surveyQuestionnairePage.questionnaireId),
      )
      .where(eq(surveyQuestionnaire.printRunId, recorded.printRunId))
      .orderBy(asc(surveyQuestionnaire.serialNumber), asc(surveyQuestionnairePage.pageNumber));
    expect(pageIds).toHaveLength(20);
    const ids = pageIds.map((p) => p.id);
    expect(
      (await decodedQrCodes(pdf, "top")).map((text) => text && pageIdFromQrText(text)),
    ).toEqual(ids);
    // As if the top of every page were torn off.
    expect(
      (await decodedQrCodes(pdf, "bottom")).map((text) => text && pageIdFromQrText(text)),
    ).toEqual(ids);
  }, 120_000);

  it("leaves out a copy voided before its file printed", async () => {
    const recorded = await recordRun(3);
    const file = await fileOf(recorded.printRunId);
    await db.transaction((tx) => issuePrintFile(tx, file.id));
    const [, voided] = await db
      .select({ id: surveyQuestionnaire.id })
      .from(surveyQuestionnaire)
      .where(eq(surveyQuestionnaire.printRunId, recorded.printRunId))
      .orderBy(asc(surveyQuestionnaire.serialNumber));
    if (!voided) throw new Error("No second copy");
    const coordinator = { kind: "hub" as const, ...scope };
    expect(
      await db.transaction((tx) =>
        voidCopy(tx, coordinator, { questionnaireId: voided.id, reason: "Torn in transit" }),
      ),
    ).toBe("voided");

    expect(await drainPrintQueue({ printRunId: recorded.printRunId })).toMatchObject({ ready: 1 });
    const printedIds = (await decodedQrCodes(await storedPdf(file), "top")).map(
      (text) => text && pageIdFromQrText(text),
    );
    const voidedPageIds = await db
      .select({ id: surveyQuestionnairePage.id })
      .from(surveyQuestionnairePage)
      .where(eq(surveyQuestionnairePage.questionnaireId, voided.id));
    expect(printedIds).toHaveLength(4);
    for (const { id } of voidedPageIds) {
      expect(printedIds).not.toContain(id);
    }
  }, 120_000);

  it("leaves a file queued again after a failed attempt until its retry time", async () => {
    const recorded = await recordRun(2);
    const file = await fileOf(recorded.printRunId);
    const retryAt = (offsetMs: number) =>
      db
        .update(surveyPrintFile)
        .set({ attempts: 1, retryAfter: new Date(Date.now() + offsetMs) })
        .where(eq(surveyPrintFile.id, file.id));

    await retryAt(60_000);
    expect(await drainPrintQueue({ printRunId: recorded.printRunId })).toEqual({
      ready: 0,
      failed: 0,
      retrying: 0,
    });
    expect(await fileOf(recorded.printRunId)).toMatchObject({ status: "QUEUED", attempts: 1 });

    await retryAt(-1_000);
    expect(await drainPrintQueue({ printRunId: recorded.printRunId })).toMatchObject({ ready: 1 });
    expect(await fileOf(recorded.printRunId)).toMatchObject({
      status: "READY",
      attempts: 2,
      retryAfter: null,
    });
  }, 120_000);

  it("takes over a file whose worker died, and fails it once no attempts are left", async () => {
    const recorded = await recordRun(2);
    const file = await fileOf(recorded.printRunId);
    const deadWorker = (attempts: number) =>
      db
        .update(surveyPrintFile)
        .set({
          status: "RENDERING",
          leaseToken: "dead-worker",
          leasedUntil: new Date(Date.now() - 1000),
          attempts,
        })
        .where(eq(surveyPrintFile.id, file.id));

    await deadWorker(3);
    expect(await drainPrintQueue({ printRunId: recorded.printRunId })).toEqual({
      ready: 0,
      failed: 0,
      retrying: 0,
    });
    expect(await fileOf(recorded.printRunId)).toMatchObject({
      status: "FAILED",
      leaseToken: null,
      error: "Rendering stopped before the file was finished",
    });

    expect(await db.transaction((tx) => retryFailedPrintFiles(tx, recorded.printRunId))).toBe(1);
    await deadWorker(1);
    expect(await drainPrintQueue({ printRunId: recorded.printRunId })).toMatchObject({ ready: 1 });
    expect(await fileOf(recorded.printRunId)).toMatchObject({ status: "READY", attempts: 2 });
  }, 120_000);
});
