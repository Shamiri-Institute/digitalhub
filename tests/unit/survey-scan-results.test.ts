// @vitest-environment node
// The tables scan results are stored in (drizzle/0054 to 0056): the answer fields a published version
// prints, the scanned pages and the answers. No screen writes them yet, so these tests write them
// against the database and expect what the constraints and triggers allow or refuse.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { and, asc, eq, inArray, isNull, sql, TransactionRollbackError } from "drizzle-orm";
import { DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool, type Transaction } from "#/db/client";
import {
  hub,
  project,
  school,
  survey,
  surveyAnswer,
  surveyPrintFile,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyUpload,
  surveyVersion,
  surveyVersionField,
} from "#/db/schema";
import type { HubSurveyScope } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import { issuePrintFile, recordPrintRun } from "#/lib/survey/print-run";
import { checkPublish } from "#/lib/survey/publish";
import { createPublishedSurvey } from "#/tests/survey-fixtures";
import { PRINT_FORM } from "./fixtures/survey-print-form";

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
    schoolName: `Scan results test school ${testSchoolId}`,
    visibleId: testSchoolId,
    hubId: scope.hubId,
  });
});

// The surveys go first, taking their versions, fields, runs, copies and pages with them.
afterAll(async () => {
  if (createdCodes.length > 0) {
    await db.delete(survey).where(inArray(survey.code, createdCodes));
  }
  await db.delete(school).where(eq(school.id, testSchoolId));
  await pool.end();
});

function publishPrintForm() {
  const code = `F${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  createdCodes.push(code);
  return createPublishedSurvey({
    code,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    form: PRINT_FORM,
  });
}

// Runs the write in a transaction that is always rolled back, and returns the database error it
// raised, or null.
async function errorOf(write: (tx: Transaction) => Promise<unknown>) {
  try {
    await db.transaction(async (tx) => {
      await write(tx);
      tx.rollback();
    });
  } catch (error) {
    if (error instanceof TransactionRollbackError) return null;
    if (error instanceof Error && error.cause instanceof DatabaseError) return error.cause;
    throw error;
  }
  return null;
}

/** What PRINT_FORM prints: its questions, a field per grid row, on the pages they print on. */
const PRINT_FORM_FIELDS = [
  { field: "age", pageNumber: 2, kind: "DIGITS" },
  { field: "dob", pageNumber: 2, kind: "DATE" },
  { field: "home", pageNumber: 1, kind: "SINGLE_CHOICE" },
  { field: "mood", pageNumber: 1, kind: "SINGLE_CHOICE" },
  { field: "notes", pageNumber: 3, kind: "TEXT" },
  { field: "phq.1", pageNumber: 2, kind: "SINGLE_CHOICE" },
  { field: "phq.2", pageNumber: 2, kind: "SINGLE_CHOICE" },
  { field: "phq.3", pageNumber: 2, kind: "SINGLE_CHOICE" },
  { field: "phq.4", pageNumber: 2, kind: "SINGLE_CHOICE" },
  { field: "phq.5", pageNumber: 2, kind: "SINGLE_CHOICE" },
  { field: "sign", pageNumber: 3, kind: "SIGNATURE" },
  { field: "sport", pageNumber: 1, kind: "MULTIPLE_CHOICE" },
];

function fieldsOf(versionId: string, tx: Transaction | typeof db = db) {
  return tx
    .select({
      field: surveyVersionField.field,
      pageNumber: surveyVersionField.pageNumber,
      kind: surveyVersionField.kind,
    })
    .from(surveyVersionField)
    .where(eq(surveyVersionField.versionId, versionId))
    .orderBy(asc(surveyVersionField.field));
}

const BACKFILL = readFileSync(
  path.join(__dirname, "../../drizzle/0056_backfill_survey_version_fields.sql"),
  "utf8",
);

describe("version fields", () => {
  it("are written when a version is published, one per field it prints", async () => {
    const published = await publishPrintForm();
    expect(await fieldsOf(published.versionId)).toEqual(PRINT_FORM_FIELDS);
  });

  it("are filled for versions published before the table existed, as publishing writes them", async () => {
    const publishable = checkPublish(PRINT_FORM, [], "NONE");
    if (!publishable.ok) throw new Error("PRINT_FORM can't be published");
    let backfilled: Awaited<ReturnType<typeof fieldsOf>> = [];
    let backfilledAgain: typeof backfilled = [];
    let draftFieldCount = -1;
    const backfillError = await errorOf(async (tx) => {
      const [created] = await tx
        .insert(survey)
        .values({
          implementerId: scope.implementerId,
          projectId: scope.projectId,
          code: `B${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          title: "Backfill test",
          createdBy: scope.userId,
        })
        .returning({ id: survey.id });
      if (!created) throw new Error("No survey");
      const [published] = await tx
        .insert(surveyVersion)
        .values({
          surveyId: created.id,
          versionNumber: 1,
          createdBy: scope.userId,
          form: PRINT_FORM,
        })
        .returning({ id: surveyVersion.id });
      if (!published) throw new Error("No version");
      // Published as before this table: the version and its layout, and no field rows.
      await tx
        .update(surveyVersion)
        .set({
          status: "PUBLISHED",
          prefill: "NONE",
          layout: publishable.layout,
          layoutEngineVersion: 2,
          publishedAt: new Date(),
          publishedBy: scope.userId,
        })
        .where(eq(surveyVersion.id, published.id));
      const [draft] = await tx
        .insert(surveyVersion)
        .values({
          surveyId: created.id,
          versionNumber: 2,
          createdBy: scope.userId,
          form: PRINT_FORM,
        })
        .returning({ id: surveyVersion.id });
      if (!draft) throw new Error("No draft");
      await tx.execute(sql.raw(BACKFILL));
      backfilled = await fieldsOf(published.id, tx);
      await tx.execute(sql.raw(BACKFILL));
      backfilledAgain = await fieldsOf(published.id, tx);
      draftFieldCount = (await fieldsOf(draft.id, tx)).length;
    });
    expect(backfillError).toBeNull();
    expect(backfilled).toEqual(PRINT_FORM_FIELDS);
    expect(backfilledAgain).toEqual(PRINT_FORM_FIELDS);
    expect(draftFieldCount).toBe(0);
  });

  it("are frozen with their version, and deleted only with it", async () => {
    const published = await publishPrintForm();
    const atMood = and(
      eq(surveyVersionField.versionId, published.versionId),
      eq(surveyVersionField.field, "mood"),
    );
    expect(
      (await errorOf((tx) => tx.update(surveyVersionField).set({ pageNumber: 2 }).where(atMood)))
        ?.message,
    ).toContain("does not change");
    expect((await errorOf((tx) => tx.delete(surveyVersionField).where(atMood)))?.message).toContain(
      "can only be deleted with its version",
    );

    const [draft] = await db
      .insert(surveyVersion)
      .values({
        surveyId: published.id,
        versionNumber: 2,
        createdBy: scope.userId,
        form: PRINT_FORM,
      })
      .returning({ id: surveyVersion.id });
    if (!draft) throw new Error("No draft");
    expect(
      (
        await errorOf((tx) =>
          tx
            .insert(surveyVersionField)
            .values({ versionId: draft.id, field: "mood", pageNumber: 1, kind: "SINGLE_CHOICE" }),
        )
      )?.constraint,
    ).toBe("survey_version_fields_guard");

    await db.delete(survey).where(eq(survey.id, published.id));
    expect(await fieldsOf(published.versionId)).toEqual([]);
  });
});

/** A one-copy run of `versionId`, issued in `tx`, with the copy's first page and an upload. */
async function copyWithScan(tx: Transaction, versionId: string) {
  const issued = await recordPrintRun(tx, scope, {
    printRunId: objectId("surveyprintrun"),
    versionId,
    request: { kind: "COUNTS", schools: [{ schoolId: testSchoolId, copies: 1 }] },
  });
  const [file] = await tx
    .select({ id: surveyPrintFile.id })
    .from(surveyPrintFile)
    .where(eq(surveyPrintFile.printRunId, issued.printRunId));
  if (!file) throw new Error("No file");
  await issuePrintFile(tx, file.id);
  const [copy] = await tx
    .select({ id: surveyQuestionnaire.id })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.printRunId, issued.printRunId));
  if (!copy) throw new Error("No copy");
  const [firstPage] = await tx
    .select({ id: surveyQuestionnairePage.id })
    .from(surveyQuestionnairePage)
    .where(
      and(
        eq(surveyQuestionnairePage.questionnaireId, copy.id),
        eq(surveyQuestionnairePage.pageNumber, 1),
      ),
    );
  if (!firstPage) throw new Error("No page");
  const uploadId = objectId("surveyupload");
  await tx.insert(surveyUpload).values({
    id: uploadId,
    hubId: scope.hubId,
    uploadedBy: scope.userId,
    s3Key: `scans/${uploadId}`,
    fileName: "batch.pdf",
    sha256: createHash("sha256").update(uploadId).digest("hex"),
    contentType: "application/pdf",
    byteSize: 1000,
    status: "UPLOADED",
    uploadedAt: new Date(),
  });
  return { questionnaireId: copy.id, questionnairePageId: firstPage.id, uploadId };
}

function scanOf(uploadId: string, pageIndex: number) {
  return { uploadId, pageIndex, imageS3Key: `pages/${uploadId}/${pageIndex}.png` };
}

describe("scanned pages", () => {
  it("match a printed page once; a later scan of it is a duplicate", async () => {
    const published = await publishPrintForm();
    const scanError = (second: "MATCHED" | "DUPLICATE") =>
      errorOf(async (tx) => {
        const { questionnairePageId, uploadId } = await copyWithScan(tx, published.versionId);
        const [matched] = await tx
          .insert(surveyScanPage)
          .values({ ...scanOf(uploadId, 0), questionnairePageId, status: "MATCHED" })
          .returning({ id: surveyScanPage.id });
        await tx.insert(surveyScanPage).values({
          ...scanOf(uploadId, 1),
          questionnairePageId,
          status: second,
          duplicateOfId: second === "DUPLICATE" ? matched?.id : undefined,
        });
      });

    expect((await scanError("MATCHED"))?.constraint).toBe(
      "survey_scan_pages_one_match_per_page_key",
    );
    expect(await scanError("DUPLICATE")).toBeNull();
  });

  it("are stored once per page of an upload, and say what they matched", async () => {
    const published = await publishPrintForm();
    const scanError = (values: Partial<typeof surveyScanPage.$inferInsert>, pageIndex = 0) =>
      errorOf(async (tx) => {
        const { questionnairePageId, uploadId } = await copyWithScan(tx, published.versionId);
        await tx.insert(surveyScanPage).values({ ...scanOf(uploadId, 0), status: "UNIDENTIFIED" });
        await tx.insert(surveyScanPage).values({
          ...scanOf(uploadId, pageIndex),
          imageS3Key: `pages/${uploadId}/second.png`,
          questionnairePageId,
          status: "MATCHED",
          ...values,
        });
      });

    expect(await scanError({}, 1)).toBeNull();
    expect((await scanError({}, 0))?.constraint).toBe("survey_scan_pages_upload_id_page_index_key");
    expect((await scanError({ status: "UNIDENTIFIED" }, 1))?.constraint).toBe(
      "survey_scan_pages_identified_check",
    );
    expect((await scanError({ status: "DUPLICATE" }, 1))?.constraint).toBe(
      "survey_scan_pages_duplicate_check",
    );
  });
});

describe("answers", () => {
  it("are only for a field their copy's version prints", async () => {
    const published = await publishPrintForm();
    const other = await publishPrintForm();
    const answerError = (values: { field: string; versionId?: string }) =>
      errorOf(async (tx) => {
        const { questionnaireId, questionnairePageId, uploadId } = await copyWithScan(
          tx,
          published.versionId,
        );
        const [scan] = await tx
          .insert(surveyScanPage)
          .values({ ...scanOf(uploadId, 0), questionnairePageId, status: "MATCHED" })
          .returning({ id: surveyScanPage.id });
        await tx.insert(surveyAnswer).values({
          questionnaireId,
          versionId: values.versionId ?? published.versionId,
          field: values.field,
          scanPageId: scan?.id,
          recognizedValue: "3",
          confidence: 0.97,
          value: "3",
          source: "PIPELINE",
          reviewStatus: "AUTO_ACCEPTED",
        });
      });

    expect(await answerError({ field: "mood" })).toBeNull();
    expect((await answerError({ field: "not_printed" }))?.constraint).toBe(
      "survey_answers_version_id_field_fkey",
    );
    expect((await answerError({ field: "mood", versionId: other.versionId }))?.constraint).toBe(
      "survey_answers_questionnaire_id_version_id_fkey",
    );
  });

  it("are one per copy and field, and say where they came from and who reviewed them", async () => {
    const published = await publishPrintForm();
    const answerError = (values: Partial<typeof surveyAnswer.$inferInsert>, twice = false) =>
      errorOf(async (tx) => {
        const { questionnaireId, questionnairePageId, uploadId } = await copyWithScan(
          tx,
          published.versionId,
        );
        const [scan] = await tx
          .insert(surveyScanPage)
          .values({ ...scanOf(uploadId, 0), questionnairePageId, status: "MATCHED" })
          .returning({ id: surveyScanPage.id });
        const answer = {
          questionnaireId,
          versionId: published.versionId,
          field: "mood",
          scanPageId: scan?.id,
          recognizedValue: "3",
          confidence: 0.97,
          value: "3",
          source: "PIPELINE" as const,
          reviewStatus: "AUTO_ACCEPTED" as const,
          ...values,
        };
        await tx.insert(surveyAnswer).values(twice ? [answer, answer] : [answer]);
      });

    expect((await answerError({}, true))?.constraint).toBe(
      "survey_answers_questionnaire_id_version_id_field_key",
    );
    expect((await answerError({ scanPageId: null }))?.constraint).toBe(
      "survey_answers_pipeline_check",
    );
    expect((await answerError({ source: "MANUAL" }))?.constraint).toBe(
      "survey_answers_manual_check",
    );
    expect((await answerError({ reviewStatus: "VERIFIED" }))?.constraint).toBe(
      "survey_answers_reviewed_check",
    );
    expect(
      await answerError({
        reviewStatus: "CORRECTED",
        value: "4",
        reviewedBy: scope.userId,
        reviewedAt: new Date(),
      }),
    ).toBeNull();
    expect((await answerError({ confidence: 1.5 }))?.constraint).toBe(
      "survey_answers_confidence_check",
    );
  });
});
