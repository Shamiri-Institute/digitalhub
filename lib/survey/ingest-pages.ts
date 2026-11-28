import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import {
  SurveyAnswerReadStatus,
  SurveyAnswerReviewStatus,
  SurveyAnswerSource,
  SurveyAuditActor,
  type SurveyFieldKind,
  SurveyScanPageStatus,
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
import { objectId } from "#/lib/crypto";
import { recordSurveyEvents, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
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
  reviewStatusOf,
  type ScanOutcome,
} from "#/lib/survey/ingest-rules";
import { pageIdFromQrText } from "#/lib/survey/print-qr";
import { hexChecksum } from "#/lib/s3/utils/checksum";
import {
  type ParsedPage,
  parsePostedPage,
  type PostedPage,
  type ReadPage,
} from "#/lib/survey/scan-wire";

export type PageIngestResult = { pageIndex: number } & (
  | { result: "stored" | "unchanged"; status: SurveyScanPageStatus }
  | { result: "conflict" | "invalid"; reason: string }
);

export type IngestPagesResult =
  | { kind: "upload-not-found" }
  | { kind: "stale-attempt"; currentAttempt: number }
  | { kind: "upload-not-accepting"; status: SurveyUploadStatus }
  | { kind: "ingested"; pages: PageIngestResult[] };

export const UPLOAD_STATUSES_ACCEPTING_PAGES: ReadonlySet<SurveyUploadStatus> = new Set([
  SurveyUploadStatus.QUEUED,
  SurveyUploadStatus.PROCESSING,
  SurveyUploadStatus.PROCESSED,
]);

type Copy = PrintedPage["copy"];

export type CheckedPageImage =
  | { ok: true; key: string; width: number; height: number }
  | { ok: false; reason: string };

export function pageImageRef(pageIndex: number, sha256Hex: string) {
  return `${pageIndex}:${sha256Hex}`;
}

const A4_HEIGHT_PER_WIDTH = 841.89 / 595.28;

export type IngestContext = {
  printedPagesById: Map<string, PrintedPage>;
  fieldsByVersionPage: Map<string, PrintedField[]>;
  rulesByVersion: Map<string, ReadonlyMap<string, AnswerRule>>;
  matchedScanByPage: Map<string, string>;
  kindsUnderReview: ReadonlySet<SurveyFieldKind>;
};

export async function ingestPages(
  tx: Transaction,
  {
    uploadId,
    attempt,
    pageImages,
  }: {
    uploadId: string;
    attempt: number;
    /** What the caller found for each image a read page names, by pageImageRef. */
    pageImages: ReadonlyMap<string, CheckedPageImage>;
  },
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
  const storedScanByIndex = new Map(
    storedScans.map((storedScan) => [storedScan.pageIndex, storedScan]),
  );

  const firstPostingByIndex = new Map<number, { position: number; postedSha256: string }>();
  const decisions = postedPages.map(({ pageIndex, parsing }, position): PageDecision => {
    if (!parsing.ok) {
      return { kind: "done", result: { pageIndex, result: "invalid", reason: parsing.reason } };
    }
    if (upload.pageCount !== null && pageIndex >= upload.pageCount) {
      const reason = `the upload has ${upload.pageCount} pages`;
      return { kind: "done", result: { pageIndex, result: "invalid", reason } };
    }
    const firstPosting = firstPostingByIndex.get(pageIndex);
    if (firstPosting) {
      return firstPosting.postedSha256 === parsing.postedSha256
        ? { kind: "repeat", pageIndex, firstPosition: firstPosting.position }
        : {
            kind: "done",
            result: {
              pageIndex,
              result: "invalid",
              reason: `page ${pageIndex} is posted twice in this post, with other content`,
            },
          };
    }
    firstPostingByIndex.set(pageIndex, { position, postedSha256: parsing.postedSha256 });
    const storedScan = storedScanByIndex.get(pageIndex);
    const repost = decideRepost(storedScan, {
      attempt,
      postedSha256: parsing.postedSha256,
      postedFailed: parsing.parsed.kind === "failed",
      uploadProcessed: upload.status === SurveyUploadStatus.PROCESSED,
    });
    if (repost.kind === "unchanged") {
      return { kind: "done", result: { pageIndex, result: "unchanged", status: repost.status } };
    }
    if (repost.kind === "conflict") {
      return { kind: "done", result: { pageIndex, result: "conflict", reason: repost.reason } };
    }
    return {
      kind: "store",
      pageIndex,
      parsed: parsing.parsed,
      postedSha256: parsing.postedSha256,
      replacedScan: repost.kind === "replace" ? storedScan : undefined,
    };
  });

  const namedPageIds = new Set<string>();
  for (const decision of decisions) {
    if (decision.kind !== "store" || decision.parsed.kind !== "read") continue;
    for (const qrText of decision.parsed.page.qrs) {
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

  // In post order: planScan records each match, which decides whether a later page is its duplicate.
  const plannedScans: PlannedScan[] = [];
  const results: PageIngestResult[] = [];
  for (const decision of decisions) {
    if (decision.kind === "done") {
      results.push(decision.result);
    } else if (decision.kind === "repeat") {
      const firstResult = results[decision.firstPosition];
      if (!firstResult) throw new Error("A repeated page comes before its first posting");
      results.push(
        firstResult.result === "stored"
          ? { pageIndex: decision.pageIndex, result: "unchanged", status: firstResult.status }
          : firstResult,
      );
    } else {
      const planning = planScan(decision, {
        uploadId,
        attempt,
        pageImages,
        uploadHubId: upload.hubId,
        context,
      });
      if (planning.ok) {
        plannedScans.push(planning.scan);
        results.push({
          pageIndex: decision.pageIndex,
          result: "stored",
          status: planning.scan.scanRow.status,
        });
      } else {
        results.push({ pageIndex: decision.pageIndex, result: "invalid", reason: planning.reason });
      }
    }
  }

  await storeScanPages(tx, plannedScans);
  const answerCountsByScan = await writeAnswers(
    tx,
    plannedScans.flatMap(({ scanRow, answersToWrite }) =>
      answersToWrite ? [{ scanPageId: scanRow.id, ...answersToWrite }] : [],
    ),
  );
  await recordSurveyEvents(
    tx,
    plannedScans.map(({ scanRow, outcome, replacedScan }) => ({
      actor: { kind: SurveyAuditActor.PIPELINE },
      surveyId: outcome.page?.copy.surveyId,
      entityType: SurveyAuditEntity.SCAN_PAGE,
      entityId: scanRow.id,
      action: SurveyAuditAction.SCAN_PAGE_INGESTED,
      before: replacedScan && {
        attempt: replacedScan.attempt,
        status: replacedScan.status,
        rejectedReason: replacedScan.rejectedReason ?? undefined,
      },
      after: {
        uploadId,
        pageIndex: scanRow.pageIndex,
        attempt,
        status: scanRow.status,
        rejectedReason: scanRow.rejectedReason ?? undefined,
        questionnaireId: outcome.page?.copy.id,
        answers: answerCountsByScan.get(scanRow.id),
      },
    })),
  );
  await recomputeCopyStatuses(tx, [
    ...new Set(
      plannedScans.flatMap(({ outcome }) =>
        outcome.status === SurveyScanPageStatus.MATCHED ? [outcome.page.copy.id] : [],
      ),
    ),
  ]);
  return { kind: "ingested", pages: results };
}

type PageDecision =
  | { kind: "done"; result: PageIngestResult }
  | { kind: "repeat"; pageIndex: number; firstPosition: number }
  | {
      kind: "store";
      pageIndex: number;
      parsed: ParsedPage;
      postedSha256: string;
      replacedScan: StoredScans[number] | undefined;
    };

type PlannedScan = {
  scanRow: typeof surveyScanPage.$inferInsert & {
    id: string;
    pageIndex: number;
    status: SurveyScanPageStatus;
  };
  outcome: ScanOutcome;
  // Only a matched page's answers are written; a duplicate's read stays in posted_result.
  answersToWrite: { copy: Copy; answers: PlannedAnswer[] } | undefined;
  replacedScan: StoredScans[number] | undefined;
};

// Pages are planned in post order, so a page sees the match of a page planned before it.
function planScan(
  decision: Extract<PageDecision, { kind: "store" }>,
  {
    uploadId,
    attempt,
    pageImages,
    uploadHubId,
    context,
  }: {
    uploadId: string;
    attempt: number;
    pageImages: ReadonlyMap<string, CheckedPageImage>;
    uploadHubId: string;
    context: IngestContext;
  },
): { ok: true; scan: PlannedScan } | { ok: false; reason: string } {
  const { pageIndex, parsed, postedSha256, replacedScan } = decision;
  const readPage = parsed.kind === "read" ? parsed.page : undefined;
  let imageS3Key: string | null = null;
  if (readPage) {
    if (!readPage.imageSha256) {
      return { ok: false, reason: "a page to store names its image in imageSha256" };
    }
    const image = pageImages.get(pageImageRef(pageIndex, hexChecksum(readPage.imageSha256)));
    if (!image) return { ok: false, reason: "no upload link was asked for this page's image" };
    if (!image.ok) return image;
    if (readPage.aligned && Math.abs(image.height - image.width * A4_HEIGHT_PER_WIDTH) > 1) {
      return {
        ok: false,
        reason: "an aligned page's image must be A4: height ÷ width = 841.89 ÷ 595.28",
      };
    }
    imageS3Key = image.key;
  }

  const identity = identifyPage(parsed, context.printedPagesById);
  const outcome = decideOutcome(
    identity,
    uploadHubId,
    identity.kind === "printed"
      ? context.matchedScanByPage.get(identity.page.questionnairePageId)
      : undefined,
  );

  let answersToWrite: PlannedScan["answersToWrite"];
  if (
    (outcome.status === SurveyScanPageStatus.MATCHED ||
      outcome.status === SurveyScanPageStatus.DUPLICATE) &&
    parsed.kind === "read"
  ) {
    const planned = planPageAnswers(context, outcome.page, parsed.page);
    if (!planned.ok) return planned;
    if (outcome.status === SurveyScanPageStatus.MATCHED) {
      answersToWrite = { copy: outcome.page.copy, answers: planned.answers };
    }
  }

  const scanPageId = replacedScan?.id ?? objectId("surveyscanpage");
  if (outcome.status === SurveyScanPageStatus.MATCHED) {
    context.matchedScanByPage.set(outcome.page.questionnairePageId, scanPageId);
  }
  return {
    ok: true,
    scan: {
      scanRow: {
        id: scanPageId,
        uploadId,
        pageIndex,
        attempt,
        imageS3Key,
        aligned: readPage ? readPage.aligned : null,
        questionnairePageId: outcome.page?.questionnairePageId ?? null,
        status: outcome.status,
        rejectedReason:
          outcome.status === SurveyScanPageStatus.REJECTED ? outcome.rejectedReason : null,
        duplicateOfId:
          outcome.status === SurveyScanPageStatus.DUPLICATE ? outcome.duplicateOfId : null,
        postedResult: parsed.page,
        postedSha256,
      },
      outcome,
      answersToWrite,
      replacedScan,
    },
  };
}

/** The answers a read of a printed page gives, one for every field the page prints. */
export function planPageAnswers(context: IngestContext, page: PrintedPage, read: ReadPage) {
  const { copy, pageNumber } = page;
  const rules = context.rulesByVersion.get(copy.versionId);
  // loadIngestContext loads rules for every version it loads fields for, so this can't miss.
  if (!rules) throw new Error(`No form loaded for version ${copy.versionId}`);
  return planAnswers({
    page: read,
    printedFields: context.fieldsByVersionPage.get(`${copy.versionId}:${pageNumber}`) ?? [],
    rules,
    kindsUnderReview: context.kindsUnderReview,
  });
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
export async function lockCopies(tx: Transaction, copyIds: string[]) {
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

export async function loadIngestContext(
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

// One statement for new and replaced pages, so a duplicate may point at a page stored beside it:
// Postgres checks the foreign keys once the statement ends.
async function storeScanPages(tx: Transaction, plannedScans: readonly PlannedScan[]) {
  if (plannedScans.length === 0) {
    return;
  }
  const stored = await tx
    .insert(surveyScanPage)
    .values(plannedScans.map(({ scanRow }) => scanRow))
    .onConflictDoUpdate({
      target: [surveyScanPage.uploadId, surveyScanPage.pageIndex],
      set: {
        attempt: sql`excluded.attempt`,
        imageS3Key: sql`excluded.image_s3_key`,
        aligned: sql`excluded.aligned`,
        questionnairePageId: sql`excluded.questionnaire_page_id`,
        status: sql`excluded.status`,
        rejectedReason: sql`excluded.rejected_reason`,
        duplicateOfId: sql`excluded.duplicate_of_id`,
        postedResult: sql`excluded.posted_result`,
        postedSha256: sql`excluded.posted_sha256`,
      },
      setWhere: isNull(surveyScanPage.questionnairePageId),
    })
    .returning({ id: surveyScanPage.id });
  const storedIds = new Set(stored.map(({ id }) => id));
  const unstored = plannedScans.find(({ scanRow }) => !storedIds.has(scanRow.id));
  if (unstored) throw new Error(`Scan page ${unstored.scanRow.pageIndex} was not stored`);
}

// Postgres takes at most 65,535 parameters per statement; an answer row binds 14.
const ANSWERS_PER_INSERT = 2_000;

export type ScanAnswers = {
  scanPageId: string;
  copy: Pick<Copy, "id" | "versionId">;
  answers: PlannedAnswer[];
};

/** Writes each matched scan's answers, keeping any answer the copy already has for a field. */
export async function writeAnswers(tx: Transaction, scans: readonly ScanAnswers[]) {
  const answerRows = scans.flatMap(({ scanPageId, copy, answers }) =>
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
  );
  const writtenKeys = new Set<string>();
  /* oxlint-disable eslint/no-await-in-loop -- one transaction runs one statement at a time */
  for (let start = 0; start < answerRows.length; start += ANSWERS_PER_INSERT) {
    const written = await tx
      .insert(surveyAnswer)
      .values(answerRows.slice(start, start + ANSWERS_PER_INSERT))
      .onConflictDoNothing({
        target: [surveyAnswer.questionnaireId, surveyAnswer.versionId, surveyAnswer.field],
      })
      .returning({ scanPageId: surveyAnswer.scanPageId, field: surveyAnswer.field });
    for (const { scanPageId, field } of written) writtenKeys.add(`${scanPageId}:${field}`);
  }
  /* oxlint-enable eslint/no-await-in-loop */

  const answerCountsByScan = new Map<string, AnswerCounts>();
  for (const { scanPageId, answers } of scans) {
    const writtenAnswers = answers.filter((answer) =>
      writtenKeys.has(`${scanPageId}:${answer.field}`),
    );
    answerCountsByScan.set(scanPageId, {
      total: writtenAnswers.length,
      autoAccepted: writtenAnswers.filter((answer) => answer.flags.length === 0).length,
      needsReview: writtenAnswers.filter((answer) => answer.flags.length > 0).length,
      noPrediction: writtenAnswers.filter(
        (answer) => answer.readStatus === SurveyAnswerReadStatus.NO_PREDICTION,
      ).length,
      keptReviewed: answers.length - writtenAnswers.length,
    });
  }
  return answerCountsByScan;
}

export type AnswerCounts = {
  total: number;
  autoAccepted: number;
  needsReview: number;
  noPrediction: number;
  keptReviewed: number;
};

export async function recomputeCopyStatuses(tx: Transaction, copyIds: string[]) {
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
  const statusChanges = copies.flatMap((copy) => {
    const status = copyStatusOf({
      current: copy.status,
      printedPages: copy.printedPages,
      matchedPages: copy.matchedPages,
      answersNeedingReview: copy.answersNeedingReview,
    });
    return status === copy.status ? [] : [{ copyId: copy.id, status }];
  });
  const changesByNewStatus = Map.groupBy(statusChanges, ({ status }) => status);
  /* oxlint-disable eslint/no-await-in-loop -- one statement per status, at most four */
  for (const [status, changes] of changesByNewStatus) {
    const changedCopyIds = changes.map(({ copyId }) => copyId);
    const updated = await tx
      .update(surveyQuestionnaire)
      .set({ status })
      .where(inArray(surveyQuestionnaire.id, changedCopyIds))
      .returning({ id: surveyQuestionnaire.id });
    const updatedIds = new Set(updated.map(({ id }) => id));
    const missingCopyId = changedCopyIds.find((copyId) => !updatedIds.has(copyId));
    if (missingCopyId) throw new Error(`Questionnaire ${missingCopyId} disappeared while locked`);
  }
  /* oxlint-enable eslint/no-await-in-loop */
}
