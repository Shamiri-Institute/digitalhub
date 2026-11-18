import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import {
  SurveyAnswerReadStatus,
  SurveyAnswerReviewStatus,
  SurveyAnswerSource,
  SurveyAuditActor,
  type SurveyFieldKind,
  SurveyScanPageStatus,
  type SurveyScanRejection,
  SurveyUploadStatus,
} from "#/db/enums";
import {
  surveyAnswer,
  surveyFieldKindReview,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyUpload,
  surveyVersion,
  surveyVersionField,
} from "#/db/schema";
import { countOf } from "#/db/sql";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import {
  type AnswerRule,
  answerRulesOf,
  copyStatusOf,
  decideOutcome,
  decideRepost,
  identifyPage,
  planAnswers,
  type PlannedAnswer,
  type PrintedField,
  type PrintedPage,
  type RepostDecision,
  reviewStatusOf,
  type ScanOutcome,
  type StoredScan,
} from "#/lib/survey/ingest-rules";
import { pageIdFromQrText } from "#/lib/survey/print-qr";
import { scanPageImageKey } from "#/lib/survey/scan-files";
import { type ParsedPage, parsePostedPage, type PostedPage } from "#/lib/survey/scan-wire";

export type PageIngestResult = { pageIndex: number } & (
  | { result: "stored" | "unchanged"; status: SurveyScanPageStatus }
  | { result: "conflict" | "invalid"; reason: string }
);

export type IngestPagesResult =
  | { kind: "upload-not-found" }
  | { kind: "stale-attempt"; currentAttempt: number }
  | { kind: "upload-not-accepting"; status: SurveyUploadStatus }
  | { kind: "ingested"; pages: PageIngestResult[] };

const UPLOAD_STATUSES_ACCEPTING_PAGES: ReadonlySet<SurveyUploadStatus> = new Set([
  SurveyUploadStatus.QUEUED,
  SurveyUploadStatus.PROCESSING,
  SurveyUploadStatus.PROCESSED,
]);

type Copy = PrintedPage["copy"];

type IngestContext = {
  printedPagesById: Map<string, PrintedPage>;
  fieldsByVersionPage: Map<string, PrintedField[]>;
  rulesByVersion: Map<string, ReadonlyMap<string, AnswerRule>>;
  matchedScanByPage: Map<string, string>;
  kindsUnderReview: ReadonlySet<SurveyFieldKind>;
};

export async function ingestPages(
  tx: Transaction,
  { uploadId, attempt }: { uploadId: string; attempt: number },
  pages: readonly PostedPage[],
): Promise<IngestPagesResult> {
  const postedPages = pages.map((posted) => ({
    pageIndex: posted.pageIndex,
    parsing: parsePostedPage(posted),
  }));

  const [upload] = await tx
    .select({
      hubId: surveyUpload.hubId,
      status: surveyUpload.status,
      attempt: surveyUpload.attempt,
      pageCount: surveyUpload.pageCount,
    })
    .from(surveyUpload)
    .where(eq(surveyUpload.id, uploadId))
    .for("update");
  if (!upload) {
    return { kind: "upload-not-found" };
  }
  if (upload.attempt !== attempt) {
    return { kind: "stale-attempt", currentAttempt: upload.attempt };
  }
  if (!UPLOAD_STATUSES_ACCEPTING_PAGES.has(upload.status)) {
    return { kind: "upload-not-accepting", status: upload.status };
  }

  const storedScans = await loadStoredScans(tx, uploadId, [
    ...new Set(
      postedPages.flatMap(({ parsing }) => (parsing.ok ? [parsing.parsed.page.pageIndex] : [])),
    ),
  ]);
  const storedScanByIndex = new Map<number, StoredScans[number]>(
    storedScans.map((storedScan) => [storedScan.pageIndex, storedScan]),
  );
  const repostOf = (storedScan: StoredScan | undefined, postedSha256: string): RepostDecision => {
    const repost = decideRepost(storedScan, attempt, postedSha256);
    return upload.status === SurveyUploadStatus.PROCESSED &&
      (repost.kind === "new" || repost.kind === "replace")
      ? { kind: "conflict", reason: "the upload is already processed" }
      : repost;
  };

  const indexesToStore = new Set<number>();
  const namedPageIds = new Set<string>();
  for (const { pageIndex, parsing } of postedPages) {
    if (!parsing.ok || (upload.pageCount !== null && pageIndex >= upload.pageCount)) continue;
    // A page at an index an earlier page of this post stores is decided against that page.
    if (!indexesToStore.has(pageIndex)) {
      const repost = repostOf(storedScanByIndex.get(pageIndex), parsing.postedSha256);
      if (repost.kind !== "new" && repost.kind !== "replace") continue;
      indexesToStore.add(pageIndex);
    }
    if (parsing.parsed.kind === "failed") continue;
    for (const qrText of parsing.parsed.page.qrs) {
      const pageId = pageIdFromQrText(qrText);
      if (pageId !== undefined) namedPageIds.add(pageId);
    }
  }
  const namedPages = await loadQuestionnairePages(tx, [...namedPageIds]);
  const copiesById = await lockCopies(tx, [
    ...new Set(namedPages.map((page) => page.questionnaireId)),
  ]);
  const context = await loadIngestContext(tx, {
    namedPages,
    copiesById,
    namedPageIds: [...namedPageIds],
  });

  const results: PageIngestResult[] = [];
  const touchedCopyIds = new Set<string>();
  /* oxlint-disable eslint/no-await-in-loop -- a page sees the writes of the pages posted before it */
  for (const { pageIndex, parsing } of postedPages) {
    if (!parsing.ok) {
      results.push({ pageIndex, result: "invalid", reason: parsing.reason });
      continue;
    }
    if (upload.pageCount !== null && pageIndex >= upload.pageCount) {
      results.push({
        pageIndex,
        result: "invalid",
        reason: `the upload has ${upload.pageCount} pages`,
      });
      continue;
    }
    const storedScan = storedScanByIndex.get(pageIndex);
    const repost = repostOf(storedScan, parsing.postedSha256);
    if (repost.kind === "unchanged") {
      results.push({ pageIndex, result: "unchanged", status: repost.status });
      continue;
    }
    if (repost.kind === "conflict") {
      results.push({ pageIndex, result: "conflict", reason: repost.reason });
      continue;
    }

    const identity = identifyPage(parsing.parsed, context.printedPagesById);
    const outcome = decideOutcome(
      identity,
      upload.hubId,
      identity.kind === "printed"
        ? context.matchedScanByPage.get(identity.page.questionnairePageId)
        : undefined,
    );

    let plannedAnswers: PlannedAnswer[] = [];
    if (
      (outcome.status === SurveyScanPageStatus.MATCHED ||
        outcome.status === SurveyScanPageStatus.DUPLICATE) &&
      parsing.parsed.kind === "read"
    ) {
      const { copy, pageNumber } = outcome.page;
      const rules = context.rulesByVersion.get(copy.versionId);
      if (!rules) throw new Error(`No form loaded for version ${copy.versionId}`);
      const planned = planAnswers({
        page: parsing.parsed.page,
        printedFields: context.fieldsByVersionPage.get(`${copy.versionId}:${pageNumber}`) ?? [],
        rules,
        kindsUnderReview: context.kindsUnderReview,
      });
      if (!planned.ok) {
        results.push({ pageIndex, result: "invalid", reason: planned.reason });
        continue;
      }
      plannedAnswers = planned.answers;
    }

    const replacedScan = repost.kind === "replace" ? storedScan : undefined;
    const questionnairePageId = outcome.page?.questionnairePageId ?? null;
    const rejectedReason =
      outcome.status === SurveyScanPageStatus.REJECTED ? outcome.rejectedReason : null;
    const scanPageId = await storeScanPage(tx, {
      uploadId,
      attempt,
      pageIndex,
      parsed: parsing.parsed,
      postedSha256: parsing.postedSha256,
      outcome,
      questionnairePageId,
      rejectedReason,
      replacedScanId: replacedScan?.id,
    });
    const answerCounts =
      outcome.status === SurveyScanPageStatus.MATCHED
        ? await writeAnswers(tx, { scanPageId, copy: outcome.page.copy, answers: plannedAnswers })
        : undefined;
    if (outcome.status === SurveyScanPageStatus.MATCHED) {
      context.matchedScanByPage.set(outcome.page.questionnairePageId, scanPageId);
      touchedCopyIds.add(outcome.page.copy.id);
    }
    storedScanByIndex.set(pageIndex, {
      id: scanPageId,
      pageIndex,
      attempt,
      postedSha256: parsing.postedSha256,
      status: outcome.status,
      questionnairePageId,
      rejectedReason,
    });

    await recordSurveyEvent(tx, {
      actor: { kind: SurveyAuditActor.PIPELINE },
      surveyId: outcome.page?.copy.surveyId,
      entityType: SurveyAuditEntity.SCAN_PAGE,
      entityId: scanPageId,
      action: SurveyAuditAction.SCAN_PAGE_INGESTED,
      before: replacedScan && {
        attempt: replacedScan.attempt,
        status: replacedScan.status,
        rejectedReason: replacedScan.rejectedReason ?? undefined,
      },
      after: {
        uploadId,
        pageIndex,
        attempt,
        status: outcome.status,
        rejectedReason: rejectedReason ?? undefined,
        questionnaireId: outcome.page?.copy.id,
        answers: answerCounts,
      },
    });
    results.push({ pageIndex, result: "stored", status: outcome.status });
  }
  /* oxlint-enable eslint/no-await-in-loop */

  await recomputeCopyStatuses(tx, [...touchedCopyIds]);
  return { kind: "ingested", pages: results };
}

async function loadStoredScans(tx: Transaction, uploadId: string, pageIndexes: number[]) {
  if (pageIndexes.length === 0) {
    return [];
  }
  return tx
    .select({
      id: surveyScanPage.id,
      pageIndex: surveyScanPage.pageIndex,
      attempt: surveyScanPage.attempt,
      postedSha256: surveyScanPage.postedSha256,
      status: surveyScanPage.status,
      questionnairePageId: surveyScanPage.questionnairePageId,
      rejectedReason: surveyScanPage.rejectedReason,
    })
    .from(surveyScanPage)
    .where(
      and(eq(surveyScanPage.uploadId, uploadId), inArray(surveyScanPage.pageIndex, pageIndexes)),
    );
}
export type StoredScans = Awaited<ReturnType<typeof loadStoredScans>>;

async function loadQuestionnairePages(tx: Transaction, pageIds: string[]) {
  if (pageIds.length === 0) {
    return [];
  }
  return tx
    .select({
      id: surveyQuestionnairePage.id,
      questionnaireId: surveyQuestionnairePage.questionnaireId,
      pageNumber: surveyQuestionnairePage.pageNumber,
    })
    .from(surveyQuestionnairePage)
    .where(inArray(surveyQuestionnairePage.id, pageIds));
}
export type QuestionnairePages = Awaited<ReturnType<typeof loadQuestionnairePages>>;

// Postgres locks the rows in the order the sort returns them.
async function lockCopies(tx: Transaction, copyIds: string[]) {
  if (copyIds.length === 0) {
    return new Map<string, Copy>();
  }
  const copies = await tx
    .select({
      id: surveyQuestionnaire.id,
      surveyId: surveyQuestionnaire.surveyId,
      versionId: surveyQuestionnaire.versionId,
      hubId: surveyQuestionnaire.hubId,
      status: surveyQuestionnaire.status,
    })
    .from(surveyQuestionnaire)
    .where(inArray(surveyQuestionnaire.id, copyIds))
    .orderBy(asc(surveyQuestionnaire.id))
    .for("update");
  return new Map(copies.map((copy) => [copy.id, copy]));
}

async function loadIngestContext(
  tx: Transaction,
  {
    namedPages,
    copiesById,
    namedPageIds,
  }: {
    namedPages: QuestionnairePages;
    copiesById: ReadonlyMap<string, Copy>;
    namedPageIds: string[];
  },
): Promise<IngestContext> {
  const printedPagesById = new Map<string, PrintedPage>();
  for (const page of namedPages) {
    const copy = copiesById.get(page.questionnaireId);
    if (!copy) throw new Error(`Questionnaire ${page.questionnaireId} disappeared while locking`);
    printedPagesById.set(page.id, {
      questionnairePageId: page.id,
      pageNumber: page.pageNumber,
      copy,
    });
  }

  const versionIds = [...new Set([...copiesById.values()].map((copy) => copy.versionId))];
  const rulesByVersion = new Map<string, ReadonlyMap<string, AnswerRule>>();
  const fieldsByVersionPage = new Map<string, PrintedField[]>();
  if (versionIds.length > 0) {
    const versions = await tx
      .select({ id: surveyVersion.id, form: surveyVersion.form })
      .from(surveyVersion)
      .where(inArray(surveyVersion.id, versionIds));
    for (const version of versions) rulesByVersion.set(version.id, answerRulesOf(version.form));
    const printedFields = await tx
      .select({
        versionId: surveyVersionField.versionId,
        pageNumber: surveyVersionField.pageNumber,
        field: surveyVersionField.field,
        kind: surveyVersionField.kind,
      })
      .from(surveyVersionField)
      .where(inArray(surveyVersionField.versionId, versionIds))
      .orderBy(asc(surveyVersionField.field));
    for (const { versionId, pageNumber, field, kind } of printedFields) {
      const key = `${versionId}:${pageNumber}`;
      const pageFields = fieldsByVersionPage.get(key);
      if (pageFields) pageFields.push({ field, kind });
      else fieldsByVersionPage.set(key, [{ field, kind }]);
    }
  }

  const matchedScanByPage = new Map<string, string>();
  if (namedPageIds.length > 0) {
    // Under READ COMMITTED this read, after the copy lock, sees a page a concurrent ingest matched.
    const matched = await tx
      .select({ id: surveyScanPage.id, questionnairePageId: surveyScanPage.questionnairePageId })
      .from(surveyScanPage)
      .where(
        and(
          eq(surveyScanPage.status, SurveyScanPageStatus.MATCHED),
          inArray(surveyScanPage.questionnairePageId, namedPageIds),
        ),
      );
    for (const scan of matched) {
      if (scan.questionnairePageId) matchedScanByPage.set(scan.questionnairePageId, scan.id);
    }
  }

  const kindRows = await tx
    .select({ kind: surveyFieldKindReview.kind })
    .from(surveyFieldKindReview);
  return {
    printedPagesById,
    fieldsByVersionPage,
    rulesByVersion,
    matchedScanByPage,
    kindsUnderReview: new Set(kindRows.map(({ kind }) => kind)),
  };
}

async function storeScanPage(
  tx: Transaction,
  {
    uploadId,
    attempt,
    pageIndex,
    parsed,
    postedSha256,
    outcome,
    questionnairePageId,
    rejectedReason,
    replacedScanId,
  }: {
    uploadId: string;
    attempt: number;
    pageIndex: number;
    parsed: ParsedPage;
    postedSha256: string;
    outcome: ScanOutcome;
    questionnairePageId: string | null;
    rejectedReason: SurveyScanRejection | null;
    replacedScanId: string | undefined;
  },
) {
  const readPage = parsed.kind === "read" ? parsed.page : undefined;
  const scan = {
    attempt,
    imageS3Key: readPage ? scanPageImageKey(uploadId, attempt, pageIndex) : null,
    aligned: readPage ? readPage.aligned : null,
    questionnairePageId,
    status: outcome.status,
    rejectedReason,
    duplicateOfId: outcome.status === SurveyScanPageStatus.DUPLICATE ? outcome.duplicateOfId : null,
    postedResult: parsed.page,
    postedSha256,
  };
  const [stored] =
    replacedScanId === undefined
      ? await tx
          .insert(surveyScanPage)
          .values({ uploadId, pageIndex, ...scan })
          .returning({ id: surveyScanPage.id })
      : await tx
          .update(surveyScanPage)
          .set(scan)
          .where(
            and(eq(surveyScanPage.id, replacedScanId), isNull(surveyScanPage.questionnairePageId)),
          )
          .returning({ id: surveyScanPage.id });
  if (!stored) throw new Error("The scan page was not stored");
  return stored.id;
}

async function writeAnswers(
  tx: Transaction,
  { scanPageId, copy, answers }: { scanPageId: string; copy: Copy; answers: PlannedAnswer[] },
) {
  const written =
    answers.length === 0
      ? []
      : await tx
          .insert(surveyAnswer)
          .values(
            answers.map((answer) => ({
              questionnaireId: copy.id,
              versionId: copy.versionId,
              field: answer.field,
              scanPageId,
              recognizedValue: answer.recognizedValue,
              confidence: answer.confidence,
              readStatus: answer.readStatus,
              readDetail: answer.readDetail,
              value: answer.recognizedValue,
              source: SurveyAnswerSource.PIPELINE,
              reviewStatus: reviewStatusOf(answer.flags),
              flags: answer.flags,
            })),
          )
          .onConflictDoNothing({
            target: [surveyAnswer.questionnaireId, surveyAnswer.versionId, surveyAnswer.field],
          })
          .returning({ field: surveyAnswer.field });
  const writtenFields = new Set(written.map(({ field }) => field));
  const writtenAnswers = answers.filter((answer) => writtenFields.has(answer.field));
  return {
    total: writtenAnswers.length,
    autoAccepted: writtenAnswers.filter((answer) => answer.flags.length === 0).length,
    needsReview: writtenAnswers.filter((answer) => answer.flags.length > 0).length,
    noPrediction: writtenAnswers.filter(
      (answer) => answer.readStatus === SurveyAnswerReadStatus.NO_PREDICTION,
    ).length,
    keptReviewed: answers.length - writtenAnswers.length,
  };
}

async function recomputeCopyStatuses(tx: Transaction, copyIds: string[]) {
  if (copyIds.length === 0) {
    return;
  }
  const copies = await tx
    .select({
      id: surveyQuestionnaire.id,
      status: surveyQuestionnaire.status,
      printedPages: countOf(surveyQuestionnairePage.questionnaireId, surveyQuestionnaire.id),
      // Raw, because a single-table select drops the table from the columns it renders here.
      matchedPages: sql<number>`(select count(*)::int from survey_scan_pages matched
        join survey_questionnaire_pages printed on printed.id = matched.questionnaire_page_id
        where printed.questionnaire_id = "survey_questionnaires"."id"
          and matched.status = ${SurveyScanPageStatus.MATCHED})`,
      answersNeedingReview: countOf(
        surveyAnswer.questionnaireId,
        surveyQuestionnaire.id,
        sql`${surveyAnswer.reviewStatus} = ${SurveyAnswerReviewStatus.NEEDS_REVIEW}`,
      ),
    })
    .from(surveyQuestionnaire)
    .where(inArray(surveyQuestionnaire.id, copyIds));
  /* oxlint-disable eslint/no-await-in-loop -- one transaction runs one statement at a time */
  for (const copy of copies) {
    const status = copyStatusOf({
      current: copy.status,
      printedPages: copy.printedPages,
      matchedPages: copy.matchedPages,
      answersNeedingReview: copy.answersNeedingReview,
    });
    if (status === copy.status) continue;
    const [updated] = await tx
      .update(surveyQuestionnaire)
      .set({ status })
      .where(eq(surveyQuestionnaire.id, copy.id))
      .returning({ id: surveyQuestionnaire.id });
    if (!updated) throw new Error(`Questionnaire ${copy.id} disappeared while locked`);
  }
  /* oxlint-enable eslint/no-await-in-loop */
}
