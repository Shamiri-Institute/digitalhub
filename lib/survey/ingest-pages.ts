import { and, asc, eq, inArray, or, sql } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import {
  SurveyAnswerReadStatus,
  SurveyAnswerReviewStatus,
  SurveyAnswerSource,
  SurveyAuditActor,
  type SurveyFieldKind,
  SurveyScanPageStatus,
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
  type PriorScan,
  reviewStatusOf,
  type ScanOutcome,
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
  | { kind: "ingested"; pages: PageIngestResult[] };

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
  const [upload] = await tx
    .select({
      hubId: surveyUpload.hubId,
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

  const postedPages = pages.map((posted) => ({
    pageIndex: posted.pageIndex,
    parsing: parsePostedPage(posted),
  }));
  const namedPageIds = [
    ...new Set(
      postedPages.flatMap(({ parsing }) =>
        parsing.ok && parsing.parsed.kind === "read"
          ? parsing.parsed.page.qrs
              .map(pageIdFromQrText)
              .filter((pageId): pageId is string => pageId !== undefined)
          : [],
      ),
    ),
  ];
  const priorRows = await loadPriorRows(tx, uploadId, [
    ...new Set(pages.map((posted) => posted.pageIndex)),
  ]);
  const namedPages = await loadQuestionnairePages(tx, namedPageIds);
  const copiesById = await lockCopies(tx, [
    ...new Set([
      ...namedPages.map((page) => page.questionnaireId),
      ...priorRows.flatMap((prior) => (prior.questionnaireId ? [prior.questionnaireId] : [])),
    ]),
  ]);
  const priorsByIndex = await completePriors(tx, priorRows, copiesById);
  const context = await loadIngestContext(tx, {
    namedPages,
    copiesById,
    pageIdsToMatch: [
      ...namedPageIds,
      ...priorRows.flatMap((prior) =>
        prior.questionnairePageId ? [prior.questionnairePageId] : [],
      ),
    ],
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
    const repost = decideRepost(priorsByIndex.get(pageIndex), attempt, parsing.postedSha256);
    if (repost.kind === "unchanged") {
      results.push({ pageIndex, result: "unchanged", status: repost.status });
      continue;
    }
    if (repost.kind === "conflict") {
      results.push({ pageIndex, result: "conflict", reason: repost.reason });
      continue;
    }
    const replacing = repost.kind === "replace" ? repost.prior : undefined;

    const identity = identifyPage(parsing.parsed, context.printedPagesById);
    const pageMatchedScanId =
      identity.kind === "printed"
        ? context.matchedScanByPage.get(identity.page.questionnairePageId)
        : undefined;
    const otherMatchedScanId = pageMatchedScanId === replacing?.id ? undefined : pageMatchedScanId;
    const outcome = decideOutcome(identity, upload.hubId, otherMatchedScanId);

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

    const scanPageId = await writeScanPage(tx, {
      uploadId,
      attempt,
      pageIndex,
      parsed: parsing.parsed,
      postedSha256: parsing.postedSha256,
      outcome,
      replacing,
    });
    const answerCounts =
      outcome.status === SurveyScanPageStatus.MATCHED
        ? await writeAnswers(tx, { scanPageId, copy: outcome.page.copy, answers: plannedAnswers })
        : undefined;

    if (
      replacing?.questionnairePageId &&
      context.matchedScanByPage.get(replacing.questionnairePageId) === replacing.id
    ) {
      context.matchedScanByPage.delete(replacing.questionnairePageId);
    }
    if (outcome.status === SurveyScanPageStatus.MATCHED) {
      context.matchedScanByPage.set(outcome.page.questionnairePageId, scanPageId);
      touchedCopyIds.add(outcome.page.copy.id);
    }
    if (replacing?.status === SurveyScanPageStatus.MATCHED && replacing.questionnaireId) {
      touchedCopyIds.add(replacing.questionnaireId);
    }
    const outcomePage = "page" in outcome ? outcome.page : null;
    priorsByIndex.set(pageIndex, {
      id: scanPageId,
      attempt,
      postedSha256: parsing.postedSha256,
      status: outcome.status,
      questionnairePageId: outcomePage?.questionnairePageId ?? null,
      questionnaireId: outcomePage?.copy.id ?? null,
      hasReviewedAnswers: false,
      hasDuplicates: false,
      copyStatus: outcomePage?.copy.status ?? null,
    });

    await recordSurveyEvent(tx, {
      actor: { kind: SurveyAuditActor.PIPELINE },
      surveyId: outcomePage?.copy.surveyId,
      entityType: SurveyAuditEntity.SCAN_PAGE,
      entityId: scanPageId,
      action: SurveyAuditAction.SCAN_PAGE_INGESTED,
      before: replacing ? { attempt: replacing.attempt, status: replacing.status } : undefined,
      after: {
        uploadId,
        pageIndex,
        attempt,
        status: outcome.status,
        rejectedReason:
          outcome.status === SurveyScanPageStatus.REJECTED ? outcome.rejectedReason : undefined,
        questionnaireId: outcomePage?.copy.id,
        answers: answerCounts,
      },
    });
    results.push({ pageIndex, result: "stored", status: outcome.status });
  }
  /* oxlint-enable eslint/no-await-in-loop */

  await recomputeCopyStatuses(tx, [...touchedCopyIds]);
  return { kind: "ingested", pages: results };
}

async function loadPriorRows(tx: Transaction, uploadId: string, pageIndexes: number[]) {
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
      questionnaireId: surveyQuestionnairePage.questionnaireId,
    })
    .from(surveyScanPage)
    .leftJoin(
      surveyQuestionnairePage,
      eq(surveyQuestionnairePage.id, surveyScanPage.questionnairePageId),
    )
    .where(
      and(eq(surveyScanPage.uploadId, uploadId), inArray(surveyScanPage.pageIndex, pageIndexes)),
    );
}

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

async function completePriors(
  tx: Transaction,
  priorRows: Awaited<ReturnType<typeof loadPriorRows>>,
  copiesById: ReadonlyMap<string, Copy>,
) {
  const matchedPriorIds = priorRows
    .filter((prior) => prior.status === SurveyScanPageStatus.MATCHED)
    .map((prior) => prior.id);
  const duplicatedIds = new Set<string>();
  const reviewedIds = new Set<string>();
  if (matchedPriorIds.length > 0) {
    const duplicated = await tx
      .selectDistinct({ id: surveyScanPage.duplicateOfId })
      .from(surveyScanPage)
      .where(inArray(surveyScanPage.duplicateOfId, matchedPriorIds));
    for (const { id } of duplicated) if (id) duplicatedIds.add(id);
    const reviewed = await tx
      .selectDistinct({ id: surveyScanPage.id })
      .from(surveyScanPage)
      .innerJoin(
        surveyQuestionnairePage,
        eq(surveyQuestionnairePage.id, surveyScanPage.questionnairePageId),
      )
      .innerJoin(
        surveyQuestionnaire,
        eq(surveyQuestionnaire.id, surveyQuestionnairePage.questionnaireId),
      )
      .innerJoin(
        surveyVersionField,
        and(
          eq(surveyVersionField.versionId, surveyQuestionnaire.versionId),
          eq(surveyVersionField.pageNumber, surveyQuestionnairePage.pageNumber),
        ),
      )
      .innerJoin(
        surveyAnswer,
        and(
          eq(surveyAnswer.questionnaireId, surveyQuestionnaire.id),
          eq(surveyAnswer.versionId, surveyQuestionnaire.versionId),
          eq(surveyAnswer.field, surveyVersionField.field),
        ),
      )
      .where(
        and(
          inArray(surveyScanPage.id, matchedPriorIds),
          or(
            eq(surveyAnswer.source, SurveyAnswerSource.MANUAL),
            inArray(surveyAnswer.reviewStatus, [
              SurveyAnswerReviewStatus.VERIFIED,
              SurveyAnswerReviewStatus.CORRECTED,
            ]),
          ),
        ),
      );
    for (const { id } of reviewed) reviewedIds.add(id);
  }
  return new Map<number, PriorScan>(
    priorRows.map((prior) => [
      prior.pageIndex,
      {
        id: prior.id,
        attempt: prior.attempt,
        postedSha256: prior.postedSha256,
        status: prior.status,
        questionnairePageId: prior.questionnairePageId,
        questionnaireId: prior.questionnaireId,
        hasReviewedAnswers: reviewedIds.has(prior.id),
        hasDuplicates: duplicatedIds.has(prior.id),
        copyStatus: prior.questionnaireId
          ? (copiesById.get(prior.questionnaireId)?.status ?? null)
          : null,
      },
    ]),
  );
}

async function loadIngestContext(
  tx: Transaction,
  {
    namedPages,
    copiesById,
    pageIdsToMatch,
  }: {
    namedPages: Awaited<ReturnType<typeof loadQuestionnairePages>>;
    copiesById: ReadonlyMap<string, Copy>;
    pageIdsToMatch: string[];
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
  if (pageIdsToMatch.length > 0) {
    const matched = await tx
      .select({ id: surveyScanPage.id, questionnairePageId: surveyScanPage.questionnairePageId })
      .from(surveyScanPage)
      .where(
        and(
          eq(surveyScanPage.status, SurveyScanPageStatus.MATCHED),
          inArray(surveyScanPage.questionnairePageId, pageIdsToMatch),
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

async function writeScanPage(
  tx: Transaction,
  {
    uploadId,
    attempt,
    pageIndex,
    parsed,
    postedSha256,
    outcome,
    replacing,
  }: {
    uploadId: string;
    attempt: number;
    pageIndex: number;
    parsed: ParsedPage;
    postedSha256: string;
    outcome: ScanOutcome;
    replacing: PriorScan | undefined;
  },
) {
  const readPage = parsed.kind === "read" ? parsed.page : undefined;
  const row = {
    attempt,
    imageS3Key: readPage ? scanPageImageKey(uploadId, attempt, pageIndex) : null,
    aligned: readPage ? readPage.aligned : null,
    questionnairePageId: "page" in outcome ? (outcome.page?.questionnairePageId ?? null) : null,
    status: outcome.status,
    rejectedReason:
      outcome.status === SurveyScanPageStatus.REJECTED ? outcome.rejectedReason : null,
    duplicateOfId: outcome.status === SurveyScanPageStatus.DUPLICATE ? outcome.duplicateOfId : null,
    postedResult: parsed.page,
    postedSha256,
  };
  if (replacing) {
    await tx
      .delete(surveyAnswer)
      .where(
        and(
          eq(surveyAnswer.scanPageId, replacing.id),
          eq(surveyAnswer.source, SurveyAnswerSource.PIPELINE),
        ),
      );
    const [replaced] = await tx
      .update(surveyScanPage)
      .set(row)
      .where(eq(surveyScanPage.id, replacing.id))
      .returning({ id: surveyScanPage.id });
    if (!replaced)
      throw new Error(`Scan page ${replacing.id} disappeared while its upload was locked`);
    return replaced.id;
  }
  const [inserted] = await tx
    .insert(surveyScanPage)
    .values({ uploadId, pageIndex, ...row })
    .returning({ id: surveyScanPage.id });
  if (!inserted) throw new Error("The scan page was not stored");
  return inserted.id;
}

const excluded = (column: { name: string }) => sql.raw(`excluded."${column.name}"`);

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
          .onConflictDoUpdate({
            target: [surveyAnswer.questionnaireId, surveyAnswer.versionId, surveyAnswer.field],
            set: {
              scanPageId: excluded(surveyAnswer.scanPageId),
              recognizedValue: excluded(surveyAnswer.recognizedValue),
              confidence: excluded(surveyAnswer.confidence),
              readStatus: excluded(surveyAnswer.readStatus),
              readDetail: excluded(surveyAnswer.readDetail),
              value: excluded(surveyAnswer.value),
              reviewStatus: excluded(surveyAnswer.reviewStatus),
              flags: excluded(surveyAnswer.flags),
              updatedAt: new Date(),
            },
            setWhere: and(
              eq(surveyAnswer.source, SurveyAnswerSource.PIPELINE),
              inArray(surveyAnswer.reviewStatus, [
                SurveyAnswerReviewStatus.AUTO_ACCEPTED,
                SurveyAnswerReviewStatus.NEEDS_REVIEW,
              ]),
            ),
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
