// @vitest-environment node
// The print job against the database and an S3-compatible server (SeaweedFS or MinIO, at S3_ENDPOINT): what
// it puts in S3, and how it recovers from a worker that died. The run page's progress and the
// download are tested through the UI in tests/e2e/hub-coordinator/print-runs.spec.ts.
import { BucketAlreadyOwnedByYou, CreateBucketCommand, GetObjectCommand } from "@aws-sdk/client-s3";
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
import { recordPrintRun } from "#/lib/survey/print-run";
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
  try {
    await getS3Client("survey-print-files").send(
      new CreateBucketCommand({ Bucket: getBucket("survey-print-files").bucket }),
    );
  } catch (error) {
    if (!(error instanceof BucketAlreadyOwnedByYou)) throw error;
  }
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
    expect(await decodedQrCodes(pdf)).toEqual(pageIds.map((p) => p.id));
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
