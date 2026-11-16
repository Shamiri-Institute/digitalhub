// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  type SQL,
  sql,
  TransactionRollbackError,
} from "drizzle-orm";
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
import type { SurveyFieldKind } from "#/db/enums";
import type { HubSurveyScope } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import { issuePrintFile, recordPrintRun } from "#/lib/survey/print-run";
import { type Layout, LAYOUT_ENGINE_VERSION, type ResponseField } from "#/lib/survey/layout";
import { checkPublish } from "#/lib/survey/publish";
import { createPublishedSurvey } from "#/tests/survey-fixtures";
import { PRINT_FORM } from "./fixtures/survey-print-form";

let scope: HubSurveyScope;
let testSchoolId: string;
const createdCodes: string[] = [];

beforeAll(async () => {
  const [defaultHub] = await db
    .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
    .orderBy(asc(hub.id))
    .limit(1);
  const member = defaultHub
    ? await db.query.implementerMember.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.implementerId, defaultHub.implementerId), eq(m.role, "ADMIN")),
        orderBy: (m, { asc }) => asc(m.id),
      })
    : undefined;
  if (!defaultHub || !member) throw new Error("Seed the database first");
  scope = { ...defaultHub, userId: member.userId };
  testSchoolId = objectId("school");
  await db.insert(school).values({
    id: testSchoolId,
    schoolName: `Scan results test school ${testSchoolId}`,
    visibleId: testSchoolId,
    hubId: scope.hubId,
  });
});

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

// survey_layout_fields (0055) maps each layout field kind to these. A new layout kind fails
// typecheck here until it is listed, and the test below until a migration maps it.
const FIELD_KINDS_OF_LAYOUT_KIND: Record<ResponseField["kind"], SurveyFieldKind[]> = {
  choice: ["SINGLE_CHOICE", "MULTIPLE_CHOICE"],
  digits: ["DIGITS"],
  date: ["DATE"],
  text: ["TEXT"],
  signature: ["SIGNATURE"],
};

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

/** `beforeFieldRows` publishes it as versions were before field rows existed. */
async function publishDirectly(
  tx: Transaction,
  {
    beforeFieldRows = false,
    changeLayout = (layout) => layout,
  }: { beforeFieldRows?: boolean; changeLayout?: (layout: Layout) => Layout } = {},
) {
  const publishable = checkPublish(PRINT_FORM, [], "NONE");
  if (!publishable.ok) throw new Error("PRINT_FORM can't be published");
  const [created] = await tx
    .insert(survey)
    .values({
      implementerId: scope.implementerId,
      projectId: scope.projectId,
      code: `B${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      title: "Published without fields",
      createdBy: scope.userId,
    })
    .returning({ id: survey.id });
  if (!created) throw new Error("No survey");
  const [version] = await tx
    .insert(surveyVersion)
    .values({ surveyId: created.id, versionNumber: 1, createdBy: scope.userId, form: PRINT_FORM })
    .returning({ id: surveyVersion.id });
  if (!version) throw new Error("No version");
  // Replica mode skips this transaction's triggers, so the publish writes no field rows.
  if (beforeFieldRows) {
    await tx.execute(sql`SET LOCAL session_replication_role = replica`);
  }
  await tx
    .update(surveyVersion)
    .set({
      status: "PUBLISHED",
      prefill: "NONE",
      layout: changeLayout(publishable.layout),
      layoutEngineVersion: LAYOUT_ENGINE_VERSION,
      publishedAt: new Date(),
      publishedBy: scope.userId,
    })
    .where(eq(surveyVersion.id, version.id));
  if (beforeFieldRows) {
    await tx.execute(sql`SET LOCAL session_replication_role = DEFAULT`);
  }
  return { surveyId: created.id, versionId: version.id };
}

describe("version fields", () => {
  it("are written when a version is published, one per field it prints", async () => {
    const published = await publishPrintForm();
    expect(await fieldsOf(published.versionId)).toEqual(PRINT_FORM_FIELDS);
  });

  it("are written however a version is published, not only by storePublished", async () => {
    let publishedFields: Awaited<ReturnType<typeof fieldsOf>> = [];
    const publishError = await errorOf(async (tx) => {
      const { versionId } = await publishDirectly(tx);
      publishedFields = await fieldsOf(versionId, tx);
    });
    expect(publishError).toBeNull();
    expect(publishedFields).toEqual(PRINT_FORM_FIELDS);
  });

  it("are filled for versions published before the table existed, as publishing writes them", async () => {
    let backfilled: Awaited<ReturnType<typeof fieldsOf>> = [];
    let backfilledAgain: typeof backfilled = [];
    let draftFieldCount = -1;
    const backfillError = await errorOf(async (tx) => {
      const { surveyId, versionId } = await publishDirectly(tx, { beforeFieldRows: true });
      const [draft] = await tx
        .insert(surveyVersion)
        .values({ surveyId, versionNumber: 2, createdBy: scope.userId, form: PRINT_FORM })
        .returning({ id: surveyVersion.id });
      if (!draft) throw new Error("No draft");
      await tx.execute(sql.raw(BACKFILL));
      backfilled = await fieldsOf(versionId, tx);
      await tx.execute(sql.raw(BACKFILL));
      backfilledAgain = await fieldsOf(versionId, tx);
      draftFieldCount = (await fieldsOf(draft.id, tx)).length;
    });
    expect(backfillError).toBeNull();
    expect(backfilled).toEqual(PRINT_FORM_FIELDS);
    expect(backfilledAgain).toEqual(PRINT_FORM_FIELDS);
    expect(draftFieldCount).toBe(0);
  });

  it("are only fields the layout prints, on its page and of its kind", async () => {
    const fieldError = (versionField: Omit<typeof surveyVersionField.$inferInsert, "versionId">) =>
      errorOf(async (tx) => {
        const { versionId } = await publishDirectly(tx, { beforeFieldRows: true });
        await tx.insert(surveyVersionField).values({ versionId, ...versionField });
      });
    const mood = { field: "mood", pageNumber: 1, kind: "SINGLE_CHOICE" } as const;

    expect(await fieldError(mood)).toBeNull();
    expect((await fieldError({ ...mood, pageNumber: 2 }))?.constraint).toBe(
      "survey_version_fields_in_layout",
    );
    expect((await fieldError({ ...mood, kind: "TEXT" }))?.constraint).toBe(
      "survey_version_fields_in_layout",
    );
    expect((await fieldError({ ...mood, field: "never_printed" }))?.constraint).toBe(
      "survey_version_fields_in_layout",
    );
  });

  it("refuse a layout that prints a field twice", async () => {
    const publishError = await errorOf((tx) =>
      publishDirectly(tx, {
        changeLayout: (layout) => ({
          ...layout,
          pages: layout.pages.map((page, index) =>
            index === 1
              ? { ...page, fields: [...page.fields, ...(layout.pages[0]?.fields ?? [])] }
              : page,
          ),
        }),
      }),
    );
    expect(publishError?.constraint).toBe("survey_version_fields_pkey");
  });

  it("refuse to publish a layout field kind they don't map, rather than guess one", async () => {
    const publishError = await errorOf((tx) =>
      publishDirectly(tx, {
        changeLayout: (layout) =>
          // A kind the layout engine has no such field for, so only JSON can carry it.
          JSON.parse(
            JSON.stringify(layout).replace('"kind":"digits"', '"kind":"rating"'),
          ) as Layout,
      }),
    );
    expect(publishError?.code).toBe("23502");
    expect(publishError?.column).toBe("kind");
  });

  it("map every kind a layout field can be", async () => {
    const expected = Object.entries(FIELD_KINDS_OF_LAYOUT_KIND).flatMap(
      ([layoutKind, fieldKinds]) =>
        fieldKinds.map((fieldKind, index) => ({
          field: `${layoutKind}_${index}`,
          layoutKind,
          multiple: fieldKind === "MULTIPLE_CHOICE",
          kind: fieldKind,
        })),
    );
    const layout = {
      pages: [
        {
          number: 1,
          fields: expected.map(({ field, layoutKind, multiple }) => ({
            field,
            kind: layoutKind,
            multiple,
          })),
        },
      ],
    };
    const { rows: mappedLayoutFields } = await db.execute<{ field: string; kind: string | null }>(
      sql`SELECT field, kind FROM survey_layout_fields(${JSON.stringify(layout)}::jsonb) ORDER BY field`,
    );
    expect(mappedLayoutFields).toEqual(
      expected
        .map(({ field, kind }) => ({ field, kind }))
        .toSorted((a, b) => a.field.localeCompare(b.field)),
    );
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
    ).toBe("survey_version_fields_in_layout");

    await db.delete(survey).where(eq(survey.id, published.id));
    expect(await fieldsOf(published.versionId)).toEqual([]);
  });
});

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
  const [firstPage, secondPage] = await tx
    .select({ id: surveyQuestionnairePage.id })
    .from(surveyQuestionnairePage)
    .where(eq(surveyQuestionnairePage.questionnaireId, copy.id))
    .orderBy(asc(surveyQuestionnairePage.pageNumber));
  if (!firstPage || !secondPage) throw new Error("No pages");
  return {
    questionnaireId: copy.id,
    questionnairePageId: firstPage.id,
    secondQuestionnairePageId: secondPage.id,
    uploadId: await createUpload(tx),
  };
}

async function createUpload(tx: Transaction) {
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
  return uploadId;
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

  it("are duplicates only of a scan of the same page", async () => {
    const published = await publishPrintForm();
    const duplicateError = (duplicatePage: "same" | "other") =>
      errorOf(async (tx) => {
        const { questionnairePageId, secondQuestionnairePageId, uploadId } = await copyWithScan(
          tx,
          published.versionId,
        );
        const [matched] = await tx
          .insert(surveyScanPage)
          .values({ ...scanOf(uploadId, 0), questionnairePageId, status: "MATCHED" })
          .returning({ id: surveyScanPage.id });
        await tx.insert(surveyScanPage).values({
          ...scanOf(uploadId, 1),
          questionnairePageId:
            duplicatePage === "same" ? questionnairePageId : secondQuestionnairePageId,
          status: "DUPLICATE",
          duplicateOfId: matched?.id,
        });
      });

    expect(await duplicateError("same")).toBeNull();
    expect((await duplicateError("other"))?.constraint).toBe(
      "survey_scan_pages_duplicate_of_id_fkey",
    );
    const ownDuplicateError = await errorOf(async (tx) => {
      const { questionnairePageId, uploadId } = await copyWithScan(tx, published.versionId);
      const scanId = objectId("surveyscanpage");
      await tx.insert(surveyScanPage).values({
        ...scanOf(uploadId, 0),
        id: scanId,
        questionnairePageId,
        status: "DUPLICATE",
        duplicateOfId: scanId,
      });
    });
    expect(ownDuplicateError?.constraint).toBe("survey_scan_pages_not_own_duplicate_check");
  });

  it("go with their upload, unless another upload's scan duplicates one of them", async () => {
    const published = await publishPrintForm();
    const deleteError = (duplicateUpload: "same" | "later") =>
      errorOf(async (tx) => {
        const { questionnairePageId, uploadId } = await copyWithScan(tx, published.versionId);
        const [matched] = await tx
          .insert(surveyScanPage)
          .values({ ...scanOf(uploadId, 0), questionnairePageId, status: "MATCHED" })
          .returning({ id: surveyScanPage.id });
        const laterUploadId = duplicateUpload === "later" ? await createUpload(tx) : uploadId;
        await tx.insert(surveyScanPage).values({
          ...scanOf(laterUploadId, 1),
          questionnairePageId,
          status: "DUPLICATE",
          duplicateOfId: matched?.id,
        });
        await tx.delete(surveyUpload).where(eq(surveyUpload.id, uploadId));
      });

    expect(await deleteError("same")).toBeNull();
    expect((await deleteError("later"))?.constraint).toBe("survey_scan_pages_duplicate_of_id_fkey");
  });

  it("are stored once per page of an upload, and say what they matched", async () => {
    const published = await publishPrintForm();
    const scanError = (scanOverrides: Partial<typeof surveyScanPage.$inferInsert>, pageIndex = 0) =>
      errorOf(async (tx) => {
        const { questionnairePageId, uploadId } = await copyWithScan(tx, published.versionId);
        await tx.insert(surveyScanPage).values({ ...scanOf(uploadId, 0), status: "UNIDENTIFIED" });
        await tx.insert(surveyScanPage).values({
          ...scanOf(uploadId, pageIndex),
          imageS3Key: `pages/${uploadId}/second.png`,
          questionnairePageId,
          status: "MATCHED",
          ...scanOverrides,
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
    expect((await scanError({ questionnairePageId: null }, 1))?.constraint).toBe(
      "survey_scan_pages_identified_check",
    );
    // A page that is no printed page's, such as a cover sheet.
    expect(await scanError({ status: "REJECTED", questionnairePageId: null }, 1)).toBeNull();
  });
});

describe("answers", () => {
  it("are only for a field their copy's version prints", async () => {
    const published = await publishPrintForm();
    const otherPublishedSurvey = await publishPrintForm();
    const answerError = (answerOverrides: { field: string; versionId?: string }) =>
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
          versionId: answerOverrides.versionId ?? published.versionId,
          field: answerOverrides.field,
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
    expect(
      (await answerError({ field: "mood", versionId: otherPublishedSurvey.versionId }))?.constraint,
    ).toBe("survey_answers_questionnaire_id_version_id_fkey");
  });

  it("are one per copy and field, and say where they came from and who reviewed them", async () => {
    const published = await publishPrintForm();
    type AnswerRow = typeof surveyAnswer.$inferInsert;
    const answerError = (
      answerOverrides: { [Column in keyof AnswerRow]?: AnswerRow[Column] | SQL },
      twice = false,
    ) =>
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
          ...answerOverrides,
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
    expect((await answerError({ reviewedBy: scope.userId }))?.constraint).toBe(
      "survey_answers_reviewed_check",
    );
    const typedIn = { source: "MANUAL" as const, recognizedValue: null, confidence: null };
    expect((await answerError(typedIn))?.constraint).toBe("survey_answers_manual_check");
    expect(
      await answerError({
        ...typedIn,
        reviewStatus: "CORRECTED",
        reviewedBy: scope.userId,
        reviewedAt: new Date(),
      }),
    ).toBeNull();
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
    expect(await answerError({ value: null })).toBeNull();
    expect((await answerError({ value: sql`'null'::jsonb` }))?.constraint).toBe(
      "survey_answers_no_json_null_check",
    );
    expect((await answerError({ recognizedValue: sql`'null'::jsonb` }))?.constraint).toBe(
      "survey_answers_no_json_null_check",
    );
  });
});
