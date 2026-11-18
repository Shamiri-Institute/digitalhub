// @vitest-environment node
// No page shows scan pages, answers or their audit yet (the review UI is ENG-2393), so these tests
// read them from the database.
import { createHash } from "node:crypto";

import { and, asc, eq, inArray, isNull, ne, sql, TransactionRollbackError } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool, type Transaction } from "#/db/client";
import {
  hub,
  type JsonValue,
  project,
  school,
  survey,
  surveyAnswer,
  surveyAuditEvent,
  surveyFieldKindReview,
  surveyPrintFile,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyUpload,
} from "#/db/schema";
import type { HubSurveyScope } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import { ingestPages } from "#/lib/survey/ingest-pages";
import { issuePrintFile, recordPrintRun } from "#/lib/survey/print-run";
import { pageQrText } from "#/lib/survey/print-qr";
import type { FieldRead, PostedPage } from "#/lib/survey/scan-wire";
import { createPublishedSurvey } from "#/tests/survey-fixtures";
import { PRINT_FORM } from "./fixtures/survey-print-form";

let scope: HubSurveyScope;
let otherHubId: string;
let testSchoolId: string;
let versionId: string;
const surveyCode = `I${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const createdCopyIds: string[] = [];
const createdUploadIds: string[] = [];

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
  const [otherHub] = defaultHub
    ? await db
        .select({ id: hub.id })
        .from(hub)
        .where(ne(hub.id, defaultHub.hubId))
        .orderBy(asc(hub.id))
        .limit(1)
    : [];
  if (!defaultHub || !member || !otherHub) throw new Error("Seed the database first");
  scope = { ...defaultHub, userId: member.userId };
  otherHubId = otherHub.id;
  testSchoolId = objectId("school");
  await db.insert(school).values({
    id: testSchoolId,
    schoolName: `Ingest test school ${testSchoolId}`,
    visibleId: testSchoolId,
    hubId: scope.hubId,
  });
  const published = await createPublishedSurvey({
    code: surveyCode,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    form: PRINT_FORM,
  });
  versionId = published.versionId;
});

afterAll(async () => {
  if (createdCopyIds.length > 0) {
    await db.delete(surveyAnswer).where(inArray(surveyAnswer.questionnaireId, createdCopyIds));
  }
  if (createdUploadIds.length > 0) {
    await db
      .delete(surveyScanPage)
      .where(
        and(
          inArray(surveyScanPage.uploadId, createdUploadIds),
          eq(surveyScanPage.status, "DUPLICATE"),
        ),
      );
    await db.delete(surveyScanPage).where(inArray(surveyScanPage.uploadId, createdUploadIds));
    await db.delete(surveyUpload).where(inArray(surveyUpload.id, createdUploadIds));
  }
  await db.delete(survey).where(eq(survey.code, surveyCode));
  await db.delete(school).where(eq(school.id, testSchoolId));
});

async function issueCopy() {
  return db.transaction(async (tx) => {
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
    createdCopyIds.push(copy.id);
    const pages = await tx
      .select({ id: surveyQuestionnairePage.id, pageNumber: surveyQuestionnairePage.pageNumber })
      .from(surveyQuestionnairePage)
      .where(eq(surveyQuestionnairePage.questionnaireId, copy.id))
      .orderBy(asc(surveyQuestionnairePage.pageNumber));
    const [first, second, third] = pages.map((page) => ({ ...page, qr: pageQrText(page.id) }));
    if (!first || !second || !third) throw new Error("No pages");
    return { questionnaireId: copy.id, pages: [first, second, third] as const };
  });
}
type IssuedPage = Awaited<ReturnType<typeof issueCopy>>["pages"][number];

async function createUpload(hubId = scope.hubId, pageCount: number | null = null) {
  const uploadId = objectId("surveyupload");
  await db.insert(surveyUpload).values({
    id: uploadId,
    hubId,
    uploadedBy: scope.userId,
    s3Key: `scans/${uploadId}`,
    fileName: "batch.pdf",
    sha256: createHash("sha256").update(uploadId).digest("hex"),
    contentType: "application/pdf",
    byteSize: 1000,
    pageCount,
    status: "PROCESSING",
    uploadedAt: new Date(),
  });
  createdUploadIds.push(uploadId);
  return uploadId;
}

function ok(field: string, value: NonNullable<FieldRead["value"]>): FieldRead {
  return { field, value, status: "ok", confidence: 0.99 };
}

const CLEAN_READS: Record<number, FieldRead[]> = {
  1: [ok("mood", "3"), ok("home", "1"), ok("sport", ["football"])],
  2: [
    ...["1", "2", "3", "4", "5"].map((row) => ok(`phq.${row}`, "0")),
    ok("age", "14"),
    ok("dob", "2011-02-28"),
  ],
  3: [{ field: "notes", value: null, status: "blank" }, ok("sign", true)],
};

function readPost(
  page: IssuedPage,
  pageIndex: number,
  {
    fields = {},
    ...overrides
  }: { fields?: Record<string, FieldRead | undefined> } & Record<string, unknown> = {},
): PostedPage {
  const reads = (CLEAN_READS[page.pageNumber] ?? [])
    .filter((read) => !(read.field in fields))
    .concat(Object.values(fields).filter((read) => read !== undefined));
  return {
    pageIndex,
    qrs: [page.qr, page.qr],
    rotation: 0,
    aligned: true,
    quality: 0.95,
    fields: reads,
    ...overrides,
  };
}

function ingest(uploadId: string, pages: PostedPage[], attempt = 1) {
  return db.transaction((tx) => ingestPages(tx, { uploadId, attempt }, pages));
}

async function rolledBack<T>(work: (tx: Transaction) => Promise<T>) {
  let result: T | undefined;
  try {
    await db.transaction(async (tx) => {
      result = await work(tx);
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return result as T;
}

async function copyStatus(questionnaireId: string) {
  const [copy] = await db
    .select({ status: surveyQuestionnaire.status })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, questionnaireId));
  return copy?.status;
}

function answersOf(questionnaireId: string, tx: Transaction | typeof db = db) {
  return tx
    .select({
      field: surveyAnswer.field,
      scanPageId: surveyAnswer.scanPageId,
      // Without drizzle's jsonb decoder, which parses a JSON string a second time ("1" reads as 1).
      value: sql<JsonValue>`${surveyAnswer.value}`,
      source: surveyAnswer.source,
      readStatus: surveyAnswer.readStatus,
      reviewStatus: surveyAnswer.reviewStatus,
      flags: surveyAnswer.flags,
    })
    .from(surveyAnswer)
    .where(eq(surveyAnswer.questionnaireId, questionnaireId))
    .orderBy(asc(surveyAnswer.field));
}

function scansOf(uploadId: string) {
  return db
    .select({
      id: surveyScanPage.id,
      pageIndex: surveyScanPage.pageIndex,
      attempt: surveyScanPage.attempt,
      status: surveyScanPage.status,
      rejectedReason: surveyScanPage.rejectedReason,
      questionnairePageId: surveyScanPage.questionnairePageId,
      duplicateOfId: surveyScanPage.duplicateOfId,
      imageS3Key: surveyScanPage.imageS3Key,
      aligned: surveyScanPage.aligned,
      postedResult: surveyScanPage.postedResult,
    })
    .from(surveyScanPage)
    .where(eq(surveyScanPage.uploadId, uploadId))
    .orderBy(asc(surveyScanPage.pageIndex));
}

function auditOf(scanPageId: string) {
  return db
    .select({
      actorKind: surveyAuditEvent.actorKind,
      surveyId: surveyAuditEvent.surveyId,
      entityType: surveyAuditEvent.entityType,
      action: surveyAuditEvent.action,
      before: surveyAuditEvent.before,
      after: surveyAuditEvent.after,
    })
    .from(surveyAuditEvent)
    .where(eq(surveyAuditEvent.entityId, scanPageId))
    .orderBy(asc(surveyAuditEvent.id));
}

async function surveyIdOf(questionnaireId: string) {
  const [copy] = await db
    .select({ surveyId: surveyQuestionnaire.surveyId })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, questionnaireId));
  return copy?.surveyId;
}

describe("ingesting pages", () => {
  it("matches a page, stores an answer per printed field, and records it", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();

    expect(await ingest(uploadId, [readPost(copy.pages[0], 0)])).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 0, result: "stored", status: "MATCHED" }],
    });
    const [scan] = await scansOf(uploadId);
    expect(scan).toMatchObject({
      attempt: 1,
      status: "MATCHED",
      questionnairePageId: copy.pages[0].id,
      imageS3Key: `pages/${uploadId}/1/0.jpg`,
      aligned: true,
    });
    expect(await answersOf(copy.questionnaireId)).toEqual(
      [
        { field: "home", value: "1" },
        { field: "mood", value: "3" },
        { field: "sport", value: ["football"] },
      ].map((answer) => ({
        ...answer,
        scanPageId: scan?.id,
        source: "PIPELINE",
        readStatus: "OK",
        reviewStatus: "AUTO_ACCEPTED",
        flags: [],
      })),
    );
    expect(await copyStatus(copy.questionnaireId)).toBe("PARTIAL");
    expect(await auditOf(scan?.id ?? "")).toEqual([
      {
        actorKind: "PIPELINE",
        surveyId: await surveyIdOf(copy.questionnaireId),
        entityType: "SCAN_PAGE",
        action: "SCAN_PAGE_INGESTED",
        before: null,
        after: {
          uploadId,
          pageIndex: 0,
          attempt: 1,
          status: "MATCHED",
          questionnaireId: copy.questionnaireId,
          answers: { total: 3, autoAccepted: 3, needsReview: 0, noPrediction: 0, keptReviewed: 0 },
        },
      },
    ]);
  });

  it("stores every page it can't match with why, and refuses only the malformed one", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    const [first, second] = copy.pages;

    expect(
      await ingest(uploadId, [
        readPost(first, 0, { qrs: [] }),
        readPost(first, 1, { qrs: ["SAMPLE-QR"] }),
        readPost(first, 2, { qrs: [first.qr, second.qr] }),
        { pageIndex: 3, error: "no image" },
        readPost(first, 4, { aligned: "yes" }),
      ]),
    ).toEqual({
      kind: "ingested",
      pages: [
        { pageIndex: 0, result: "stored", status: "UNIDENTIFIED" },
        { pageIndex: 1, result: "stored", status: "REJECTED" },
        { pageIndex: 2, result: "stored", status: "REJECTED" },
        { pageIndex: 3, result: "stored", status: "REJECTED" },
        {
          pageIndex: 4,
          result: "invalid",
          reason: "aligned: Invalid input: expected boolean, received string",
        },
      ],
    });
    const scans = await scansOf(uploadId);
    expect(
      scans.map(({ pageIndex, status, rejectedReason, questionnairePageId, imageS3Key }) => ({
        pageIndex,
        status,
        rejectedReason,
        questionnairePageId,
        imageS3Key,
      })),
    ).toEqual([
      {
        pageIndex: 0,
        status: "UNIDENTIFIED",
        rejectedReason: null,
        questionnairePageId: null,
        imageS3Key: `pages/${uploadId}/1/0.jpg`,
      },
      {
        pageIndex: 1,
        status: "REJECTED",
        rejectedReason: "UNKNOWN_CODE",
        questionnairePageId: null,
        imageS3Key: `pages/${uploadId}/1/1.jpg`,
      },
      {
        pageIndex: 2,
        status: "REJECTED",
        rejectedReason: "CODES_DISAGREE",
        questionnairePageId: null,
        imageS3Key: `pages/${uploadId}/1/2.jpg`,
      },
      {
        pageIndex: 3,
        status: "REJECTED",
        rejectedReason: "UNREADABLE",
        questionnairePageId: null,
        imageS3Key: null,
      },
    ]);
    expect(scans[0]?.postedResult).toEqual(readPost(first, 0, { qrs: [] }));
    expect(scans[3]?.postedResult).toEqual({ pageIndex: 3, error: "no image" });
    expect(await auditOf(scans[3]?.id ?? "")).toEqual([
      expect.objectContaining({
        surveyId: null,
        after: {
          uploadId,
          pageIndex: 3,
          attempt: 1,
          status: "REJECTED",
          rejectedReason: "UNREADABLE",
        },
      }),
    ]);
    expect(await answersOf(copy.questionnaireId)).toEqual([]);
    expect(await copyStatus(copy.questionnaireId)).toBe("ISSUED");

    expect(await ingest(uploadId, [{ pageIndex: 3, error: "no image" }])).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 3, result: "unchanged", status: "REJECTED" }],
    });
  });

  it("rejects a page of a void copy, or another hub's, before calling it a duplicate", async () => {
    const copy = await issueCopy();
    const firstUploadId = await createUpload();
    await ingest(firstUploadId, [readPost(copy.pages[0], 0)]);

    const otherHubUploadId = await createUpload(otherHubId);
    expect(await ingest(otherHubUploadId, [readPost(copy.pages[0], 0)])).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 0, result: "stored", status: "REJECTED" }],
    });
    expect((await scansOf(otherHubUploadId))[0]).toMatchObject({
      rejectedReason: "OTHER_HUB",
      questionnairePageId: copy.pages[0].id,
    });

    await db
      .update(surveyQuestionnaire)
      .set({ status: "VOID" })
      .where(eq(surveyQuestionnaire.id, copy.questionnaireId));
    const laterUploadId = await createUpload();
    expect(await ingest(laterUploadId, [readPost(copy.pages[0], 0)])).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 0, result: "stored", status: "REJECTED" }],
    });
    expect((await scansOf(laterUploadId))[0]).toMatchObject({
      rejectedReason: "VOID_COPY",
      questionnairePageId: copy.pages[0].id,
    });
    expect(await copyStatus(copy.questionnaireId)).toBe("VOID");
  });

  it("stores a second scan of a matched page as its duplicate, leaving the answers", async () => {
    const copy = await issueCopy();
    const firstUploadId = await createUpload();
    await ingest(firstUploadId, [readPost(copy.pages[0], 0)]);
    const answersBefore = await answersOf(copy.questionnaireId);

    const laterUploadId = await createUpload();
    expect(
      await ingest(laterUploadId, [
        readPost(copy.pages[0], 0, { fields: { mood: ok("mood", "1") } }),
        readPost(copy.pages[0], 1, { fields: { age: ok("age", "14") } }),
      ]),
    ).toEqual({
      kind: "ingested",
      pages: [
        { pageIndex: 0, result: "stored", status: "DUPLICATE" },
        { pageIndex: 1, result: "invalid", reason: "age is not printed on this page" },
      ],
    });
    const [matched] = await scansOf(firstUploadId);
    expect(
      (await scansOf(laterUploadId)).map(({ status, duplicateOfId }) => ({
        status,
        duplicateOfId,
      })),
    ).toEqual([{ status: "DUPLICATE", duplicateOfId: matched?.id }]);
    expect(await answersOf(copy.questionnaireId)).toEqual(answersBefore);
  });

  it("resolves a page posted twice in one post like two posts", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    expect(
      await ingest(uploadId, [
        readPost(copy.pages[0], 0),
        readPost(copy.pages[0], 1),
        readPost(copy.pages[1], 2),
        readPost(copy.pages[1], 2),
        readPost(copy.pages[2], 3),
        readPost(copy.pages[2], 3, { quality: 0.5 }),
      ]),
    ).toEqual({
      kind: "ingested",
      pages: [
        { pageIndex: 0, result: "stored", status: "MATCHED" },
        { pageIndex: 1, result: "stored", status: "DUPLICATE" },
        { pageIndex: 2, result: "stored", status: "MATCHED" },
        { pageIndex: 2, result: "unchanged", status: "MATCHED" },
        { pageIndex: 3, result: "stored", status: "MATCHED" },
        {
          pageIndex: 3,
          result: "conflict",
          reason: "this page was already posted with other content",
        },
      ],
    });
    expect(await copyStatus(copy.questionnaireId)).toBe("READY");
  });

  it("refuses a page the upload doesn't have, an upload that doesn't exist, and an old attempt", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload(scope.hubId, 2);
    expect(await ingest(uploadId, [readPost(copy.pages[0], 2)])).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 2, result: "invalid", reason: "the upload has 2 pages" }],
    });
    expect(await ingest(objectId("surveyupload"), [readPost(copy.pages[0], 0)])).toEqual({
      kind: "upload-not-found",
    });
    await db.update(surveyUpload).set({ attempt: 2 }).where(eq(surveyUpload.id, uploadId));
    expect(await ingest(uploadId, [readPost(copy.pages[0], 0)], 1)).toEqual({
      kind: "stale-attempt",
      currentAttempt: 2,
    });
    expect(await scansOf(uploadId)).toEqual([]);
  });
});

describe("re-posting a page", () => {
  it("with the same content changes nothing, and with other content keeps the first", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    const posted = readPost(copy.pages[0], 0);
    await ingest(uploadId, [posted]);
    const [scan] = await scansOf(uploadId);
    const answersBefore = await answersOf(copy.questionnaireId);

    const reordered = Object.fromEntries(Object.entries(posted).toReversed()) as PostedPage;
    expect(await ingest(uploadId, [reordered])).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 0, result: "unchanged", status: "MATCHED" }],
    });
    expect(
      await ingest(uploadId, [readPost(copy.pages[0], 0, { fields: { mood: ok("mood", "1") } })]),
    ).toEqual({
      kind: "ingested",
      pages: [
        {
          pageIndex: 0,
          result: "conflict",
          reason: "this page was already posted with other content",
        },
      ],
    });
    expect(await answersOf(copy.questionnaireId)).toEqual(answersBefore);
    expect(await auditOf(scan?.id ?? "")).toHaveLength(1);
  });

  it("from a new attempt replaces the page's answers in place", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    await ingest(uploadId, [readPost(copy.pages[0], 0)]);
    const [firstScan] = await scansOf(uploadId);

    await db.update(surveyUpload).set({ attempt: 2 }).where(eq(surveyUpload.id, uploadId));
    expect(
      await ingest(
        uploadId,
        [readPost(copy.pages[0], 0, { fields: { mood: ok("mood", "1") } })],
        2,
      ),
    ).toEqual({ kind: "ingested", pages: [{ pageIndex: 0, result: "stored", status: "MATCHED" }] });
    const [secondScan] = await scansOf(uploadId);
    expect(secondScan).toMatchObject({
      id: firstScan?.id,
      attempt: 2,
      imageS3Key: `pages/${uploadId}/2/0.jpg`,
    });
    expect(
      (await answersOf(copy.questionnaireId)).map(({ field, value, scanPageId }) => ({
        field,
        value,
        scanPageId,
      })),
    ).toEqual([
      { field: "home", value: "1", scanPageId: firstScan?.id },
      { field: "mood", value: "1", scanPageId: firstScan?.id },
      { field: "sport", value: ["football"], scanPageId: firstScan?.id },
    ]);
    expect((await auditOf(firstScan?.id ?? ""))[1]?.before).toEqual({
      attempt: 1,
      status: "MATCHED",
    });
  });

  it("from a new attempt that finds no code unmatches the page and its answers", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    await ingest(uploadId, [readPost(copy.pages[0], 0)]);
    expect(await copyStatus(copy.questionnaireId)).toBe("PARTIAL");

    await db.update(surveyUpload).set({ attempt: 2 }).where(eq(surveyUpload.id, uploadId));
    expect(await ingest(uploadId, [readPost(copy.pages[0], 0, { qrs: [] })], 2)).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 0, result: "stored", status: "UNIDENTIFIED" }],
    });
    expect(await answersOf(copy.questionnaireId)).toEqual([]);
    expect(await copyStatus(copy.questionnaireId)).toBe("ISSUED");
  });

  it("from a new attempt is refused once a person has worked on the page", async () => {
    const reviewedCopy = async (review: (questionnaireId: string) => Promise<unknown>) => {
      const copy = await issueCopy();
      const uploadId = await createUpload();
      await ingest(uploadId, [readPost(copy.pages[0], 0)]);
      await review(copy.questionnaireId);
      await db.update(surveyUpload).set({ attempt: 2 }).where(eq(surveyUpload.id, uploadId));
      const answersBefore = await answersOf(copy.questionnaireId);
      const result = await ingest(
        uploadId,
        [readPost(copy.pages[0], 0, { fields: { mood: ok("mood", "1") } })],
        2,
      );
      expect(await answersOf(copy.questionnaireId)).toEqual(answersBefore);
      return result;
    };
    const atField = (questionnaireId: string, field: string) =>
      and(eq(surveyAnswer.questionnaireId, questionnaireId), eq(surveyAnswer.field, field));
    const refused = (reason: string) => ({
      kind: "ingested",
      pages: [{ pageIndex: 0, result: "conflict", reason }],
    });

    expect(
      await reviewedCopy((questionnaireId) =>
        db
          .update(surveyAnswer)
          .set({ reviewStatus: "VERIFIED", reviewedBy: scope.userId, reviewedAt: new Date() })
          .where(atField(questionnaireId, "home")),
      ),
    ).toEqual(refused("this page's answers are already reviewed"));
    expect(
      await reviewedCopy((questionnaireId) =>
        db
          .update(surveyAnswer)
          .set({
            source: "MANUAL",
            recognizedValue: null,
            confidence: null,
            readStatus: null,
            readDetail: null,
            value: "2",
            reviewStatus: "CORRECTED",
            reviewedBy: scope.userId,
            reviewedAt: new Date(),
          })
          .where(atField(questionnaireId, "sport")),
      ),
    ).toEqual(refused("this page's answers are already reviewed"));
    expect(
      await reviewedCopy((questionnaireId) =>
        db
          .update(surveyQuestionnaire)
          .set({ status: "VERIFIED" })
          .where(eq(surveyQuestionnaire.id, questionnaireId)),
      ),
    ).toEqual(refused("this page's answers are already reviewed"));
  });
});

describe("a matched page's answers", () => {
  it("leave an answer a reviewer typed in before the page was read", async () => {
    const copy = await issueCopy();
    await db.insert(surveyAnswer).values({
      questionnaireId: copy.questionnaireId,
      versionId,
      field: "mood",
      value: "2",
      source: "MANUAL",
      reviewStatus: "CORRECTED",
      reviewedBy: scope.userId,
      reviewedAt: new Date(),
    });
    const uploadId = await createUpload();
    expect(await ingest(uploadId, [readPost(copy.pages[0], 0)])).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 0, result: "stored", status: "MATCHED" }],
    });
    const [scan] = await scansOf(uploadId);
    expect(
      (await answersOf(copy.questionnaireId)).map(({ field, value, source, scanPageId }) => ({
        field,
        value,
        source,
        scanPageId,
      })),
    ).toEqual([
      { field: "home", value: "1", source: "PIPELINE", scanPageId: scan?.id },
      { field: "mood", value: "2", source: "MANUAL", scanPageId: null },
      { field: "sport", value: ["football"], source: "PIPELINE", scanPageId: scan?.id },
    ]);
    expect((await auditOf(scan?.id ?? ""))[0]?.after).toMatchObject({
      answers: { total: 2, keptReviewed: 1 },
    });
  });

  it("store a printed field the post leaves out as unread, for review", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    await ingest(uploadId, [
      readPost(copy.pages[0], 0, { fields: { mood: undefined } }),
      readPost(copy.pages[1], 1),
      readPost(copy.pages[2], 2),
    ]);
    expect((await answersOf(copy.questionnaireId)).find((a) => a.field === "mood")).toMatchObject({
      value: null,
      readStatus: "NO_PREDICTION",
      reviewStatus: "NEEDS_REVIEW",
      flags: ["NO_PREDICTION"],
    });
    expect(await copyStatus(copy.questionnaireId)).toBe("NEEDS_REVIEW");
  });

  it("go to review when they break a form rule or a review rule, and are accepted otherwise", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    await ingest(uploadId, [
      readPost(copy.pages[0], 0, {
        fields: {
          mood: ok("mood", "9"),
          home: { field: "home", value: null, status: "uncertain" },
          sport: { field: "sport", value: null, status: "blank" },
        },
      }),
      readPost(copy.pages[1], 1, {
        aligned: false,
        fields: { age: { ...ok("age", "14"), confidence: 0.85 } },
      }),
      readPost(copy.pages[2], 2, { fields: { notes: ok("notes", "I like school") } }),
    ]);
    const flagsByField = Object.fromEntries(
      (await answersOf(copy.questionnaireId)).map(({ field, flags }) => [field, flags]),
    );
    expect(flagsByField).toEqual({
      age: ["NOT_ALIGNED", "LOW_CONFIDENCE"],
      dob: ["NOT_ALIGNED"],
      home: ["UNCERTAIN"],
      mood: ["BREAKS_FORM_RULE"],
      notes: ["HANDWRITING"],
      "phq.1": ["NOT_ALIGNED"],
      "phq.2": ["NOT_ALIGNED"],
      "phq.3": ["NOT_ALIGNED"],
      "phq.4": ["NOT_ALIGNED"],
      "phq.5": ["NOT_ALIGNED"],
      sign: [],
      sport: [],
    });
    expect(await copyStatus(copy.questionnaireId)).toBe("NEEDS_REVIEW");
  });

  it("of a field kind switched to review go to review, as a setting rather than a deploy", async () => {
    const copy = await issueCopy();
    const ingestPageTwo = async (tx: Transaction) => {
      const uploadId = await createUpload();
      await ingestPages(tx, { uploadId, attempt: 1 }, [readPost(copy.pages[1], 0)]);
      return answersOf(copy.questionnaireId, tx);
    };
    const switched = await rolledBack(async (tx) => {
      await tx.insert(surveyFieldKindReview).values({ kind: "DATE" });
      return ingestPageTwo(tx);
    });
    expect(switched.filter((answer) => answer.reviewStatus === "NEEDS_REVIEW")).toEqual([
      expect.objectContaining({ field: "dob", flags: ["KIND_UNDER_REVIEW"] }),
    ]);
    const unswitched = await rolledBack(ingestPageTwo);
    expect(unswitched.filter((answer) => answer.reviewStatus === "NEEDS_REVIEW")).toEqual([]);
  });

  it("make a page invalid, storing nothing, when a value has the wrong shape for its kind", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    expect(
      await ingest(uploadId, [readPost(copy.pages[0], 0, { fields: { mood: ok("mood", ["3"]) } })]),
    ).toEqual({
      kind: "ingested",
      pages: [
        { pageIndex: 0, result: "invalid", reason: "mood: a single choice is one option code" },
      ],
    });
    expect(await scansOf(uploadId)).toEqual([]);
    expect(await answersOf(copy.questionnaireId)).toEqual([]);
  });
});

describe("a copy's status", () => {
  it("leaves a VERIFIED copy VERIFIED when another scan of its page comes in", async () => {
    const copy = await issueCopy();
    const uploadId = await createUpload();
    await ingest(
      uploadId,
      copy.pages.map((page, index) => readPost(page, index)),
    );
    expect(await copyStatus(copy.questionnaireId)).toBe("READY");
    await db
      .update(surveyQuestionnaire)
      .set({ status: "VERIFIED" })
      .where(eq(surveyQuestionnaire.id, copy.questionnaireId));
    const laterUploadId = await createUpload();
    expect(await ingest(laterUploadId, [readPost(copy.pages[0], 0)])).toEqual({
      kind: "ingested",
      pages: [{ pageIndex: 0, result: "stored", status: "DUPLICATE" }],
    });
    expect(await copyStatus(copy.questionnaireId)).toBe("VERIFIED");
  });
});

async function backendPid(tx: Transaction) {
  const { rows } = await tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`);
  const [row] = rows;
  if (!row) throw new Error("No backend pid");
  return row.pid;
}

async function ingestWhileFirstHoldsLocks(
  [firstUploadId, firstPages]: [string, PostedPage[]],
  [secondUploadId, secondPages]: [string, PostedPage[]],
) {
  const firstHoldsLocks = Promise.withResolvers<void>();
  const releaseFirst = Promise.withResolvers<void>();
  const first = db.transaction(async (tx) => {
    const result = await ingestPages(tx, { uploadId: firstUploadId, attempt: 1 }, firstPages);
    firstHoldsLocks.resolve();
    await releaseFirst.promise;
    return result;
  });
  await firstHoldsLocks.promise;
  const secondPid = Promise.withResolvers<number>();
  const second = db.transaction(async (tx) => {
    secondPid.resolve(await backendPid(tx));
    return ingestPages(tx, { uploadId: secondUploadId, attempt: 1 }, secondPages);
  });
  const pid = await secondPid.promise;
  await expect
    .poll(async () => {
      const { rows } = await pool.query<{ waitEventType: string | null }>(
        `select wait_event_type as "waitEventType" from pg_stat_activity where pid = $1`,
        [pid],
      );
      return rows[0]?.waitEventType;
    })
    .toBe("Lock");
  releaseFirst.resolve();
  return Promise.all([first, second]);
}

describe("two ingests at once", () => {
  it("of different pages of one copy finish it, rather than each seeing the other's page missing", async () => {
    const copy = await issueCopy();
    const firstUploadId = await createUpload();
    const secondUploadId = await createUpload();
    expect(
      await ingestWhileFirstHoldsLocks(
        [firstUploadId, [readPost(copy.pages[0], 0), readPost(copy.pages[1], 1)]],
        [secondUploadId, [readPost(copy.pages[2], 0)]],
      ),
    ).toEqual([
      {
        kind: "ingested",
        pages: [
          { pageIndex: 0, result: "stored", status: "MATCHED" },
          { pageIndex: 1, result: "stored", status: "MATCHED" },
        ],
      },
      { kind: "ingested", pages: [{ pageIndex: 0, result: "stored", status: "MATCHED" }] },
    ]);
    expect(await copyStatus(copy.questionnaireId)).toBe("READY");
  });

  it("of the same page match it once and store the other as its duplicate", async () => {
    const copy = await issueCopy();
    const firstUploadId = await createUpload();
    const secondUploadId = await createUpload();
    expect(
      await ingestWhileFirstHoldsLocks(
        [firstUploadId, [readPost(copy.pages[0], 0)]],
        [secondUploadId, [readPost(copy.pages[0], 0)]],
      ),
    ).toEqual([
      { kind: "ingested", pages: [{ pageIndex: 0, result: "stored", status: "MATCHED" }] },
      { kind: "ingested", pages: [{ pageIndex: 0, result: "stored", status: "DUPLICATE" }] },
    ]);
    const [matched] = await scansOf(firstUploadId);
    expect((await scansOf(secondUploadId))[0]?.duplicateOfId).toBe(matched?.id);
  });

  it("of pages of the same copies in opposite orders both finish", async () => {
    const [firstCopy, secondCopy] = [await issueCopy(), await issueCopy()];
    const firstUploadId = await createUpload();
    const secondUploadId = await createUpload();
    const results = await Promise.all([
      ingest(firstUploadId, [readPost(firstCopy.pages[0], 0), readPost(secondCopy.pages[0], 1)]),
      ingest(secondUploadId, [readPost(secondCopy.pages[1], 0), readPost(firstCopy.pages[1], 1)]),
    ]);
    expect(
      results.map(
        (result) => result.kind === "ingested" && result.pages.map((page) => page.result),
      ),
    ).toEqual([
      ["stored", "stored"],
      ["stored", "stored"],
    ]);
    expect([
      await copyStatus(firstCopy.questionnaireId),
      await copyStatus(secondCopy.questionnaireId),
    ]).toEqual(["PARTIAL", "PARTIAL"]);
  });
});
