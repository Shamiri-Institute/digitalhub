// Research admins' review of scanned answers the SDH flagged: the queue, one answer in focus, and
// a decision on it. A decision changes the answer's value and review status, never what the
// pipeline read, and records both in the audit log. Every read and write is held to the admin's
// implementer and project.

import "server-only";

import { and, asc, count, eq, inArray, notInArray, type SQL, sql } from "drizzle-orm";
import type { PgSelect } from "drizzle-orm/pg-core";

import { db, type Transaction } from "#/db/client";
import {
  type SurveyAnswerFlag,
  SurveyAnswerReviewStatus,
  SurveyAuditActor,
  SurveyQuestionnaireStatus,
} from "#/db/enums";
import {
  hub,
  type JsonValue,
  school,
  survey,
  surveyAnswer,
  surveyAuditEvent,
  surveyQuestionnaire,
  surveyScanPage,
  surveyVersion,
  surveyVersionField,
  user,
} from "#/db/schema";
import { SurveyError } from "#/lib/actions/survey/respond";
import type { AdminScope } from "#/lib/auth/admin-access";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { getPresignedUrl } from "#/lib/s3/s3.service";
import {
  type AnswerValue,
  changesAnswer,
  fieldCropOf,
  type FieldQuestion,
  fieldQuestionOf,
  fieldQuestionsOf,
  normalisedAnswer,
  isSettledCopy,
  reviewedByAPerson,
  SETTLED_COPY_STATUSES,
} from "#/lib/survey/answer-fields";
import type { Layout, LayoutPage } from "#/lib/survey/layout";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { recomputeCopyStatuses } from "#/lib/survey/ingest-pages";
import { type AnswerRule, answerRulesOf, keepsFormRule } from "#/lib/survey/ingest-rules";
import { storable } from "#/lib/survey/scan-wire";

/** Answers listed at once; filters narrow a longer queue. */
const QUEUE_LIMIT = 200;
/**
 * Page image links are signed as of the start of a window, so every link to one image in a window
 * is the same URL: the browser fetches it once, for each field on the page and for the preload.
 */
const IMAGE_LINK_WINDOW_MS = 10 * 60 * 1000;
const IMAGE_LINK_SECONDS = 60 * 60;

export type ReviewFilters = {
  surveyId?: string;
  hubId?: string;
  schoolId?: string;
  flag?: SurveyAnswerFlag;
};

function inScope(scope: AdminScope) {
  return and(eq(survey.implementerId, scope.implementerId), eq(survey.projectId, scope.projectId));
}

function waitingForReview(scope: AdminScope) {
  return and(
    inScope(scope),
    eq(surveyAnswer.reviewStatus, SurveyAnswerReviewStatus.NEEDS_REVIEW),
    notInArray(surveyQuestionnaire.status, [...SETTLED_COPY_STATUSES]),
  );
}

function matchingFilters(filters: ReviewFilters): SQL[] {
  return [
    filters.surveyId ? eq(survey.id, filters.surveyId) : undefined,
    filters.hubId ? eq(surveyQuestionnaire.hubId, filters.hubId) : undefined,
    filters.schoolId ? eq(surveyQuestionnaire.schoolId, filters.schoolId) : undefined,
    filters.flag ? sql`${filters.flag} = any(${surveyAnswer.flags})` : undefined,
  ].filter((condition) => condition !== undefined);
}

/**
 * Answers waiting for review, in the order a reviewer meets them on paper: by survey, copy, page
 * and position on the page. At most QUEUE_LIMIT; `total` counts them all.
 */
export async function fetchReviewQueue(scope: AdminScope, filters: ReviewFilters) {
  const where = and(waitingForReview(scope), ...matchingFilters(filters));
  const [waiting, [totals]] = await Promise.all([
    withCopyAndSurvey(
      db
        .select({
          id: surveyAnswer.id,
          field: surveyAnswer.field,
          flags: surveyAnswer.flags,
          versionId: surveyAnswer.versionId,
          serial: surveyQuestionnaire.serial,
          serialNumber: surveyQuestionnaire.serialNumber,
          surveyCode: survey.code,
          pageNumber: surveyVersionField.pageNumber,
        })
        .from(surveyAnswer)
        .$dynamic(),
    )
      .innerJoin(
        surveyVersionField,
        and(
          eq(surveyVersionField.versionId, surveyAnswer.versionId),
          eq(surveyVersionField.field, surveyAnswer.field),
        ),
      )
      .where(where)
      .orderBy(
        asc(survey.code),
        asc(surveyQuestionnaire.serialNumber),
        asc(surveyVersionField.pageNumber),
        asc(surveyAnswer.id),
      )
      .limit(QUEUE_LIMIT),
    withCopyAndSurvey(db.select({ total: count() }).from(surveyAnswer).$dynamic()).where(where),
  ]);

  // Within a page, in the order the layout prints its fields, which is top to bottom.
  const versions = await versionsOf([...new Set(waiting.map((answer) => answer.versionId))]);
  const printedPosition = (answer: (typeof waiting)[number]) =>
    versions.get(answer.versionId)?.positions.get(answer.field) ?? 0;
  const ordered = waiting.toSorted(
    (a, b) =>
      a.surveyCode.localeCompare(b.surveyCode) ||
      a.serialNumber - b.serialNumber ||
      a.pageNumber - b.pageNumber ||
      printedPosition(a) - printedPosition(b),
  );
  return {
    total: totals?.total ?? 0,
    answers: ordered.map((answer) => {
      const question = versions.get(answer.versionId)?.questions.get(answer.field);
      return {
        id: answer.id,
        field: answer.field,
        flags: answer.flags,
        serial: answer.serial,
        pageNumber: answer.pageNumber,
        prompt: question?.rowLabel ?? question?.prompt ?? answer.field,
      };
    }),
  };
}

function withCopyAndSurvey<Query extends PgSelect>(query: Query) {
  return query
    .innerJoin(
      surveyQuestionnaire,
      and(
        eq(surveyQuestionnaire.id, surveyAnswer.questionnaireId),
        eq(surveyQuestionnaire.versionId, surveyAnswer.versionId),
      ),
    )
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId));
}

export type ReviewQueue = Awaited<ReturnType<typeof fetchReviewQueue>>;
export type QueuedAnswer = ReviewQueue["answers"][number];

/** Each version's questions by field, and where on its page each field is printed. */
type VersionFields = {
  questions: ReadonlyMap<string, FieldQuestion>;
  positions: ReadonlyMap<string, number>;
};

async function versionsOf(versionIds: string[]): Promise<Map<string, VersionFields>> {
  if (versionIds.length === 0) return new Map();
  const versions = await db
    .select({
      id: surveyVersion.id,
      form: surveyVersion.form,
      // The printed order of fields, without loading the rest of the layout.
      fieldOrder: sql<
        string[]
      >`coalesce(jsonb_path_query_array(${surveyVersion.layout}, '$.pages[*].fields[*].field'), '[]'::jsonb)`,
    })
    .from(surveyVersion)
    .where(inArray(surveyVersion.id, versionIds));
  return new Map(
    versions.map(({ id, form, fieldOrder }) => [
      id,
      {
        questions: fieldQuestionsOf(form),
        positions: new Map(fieldOrder.map((field, position) => [field, position] as const)),
      },
    ]),
  );
}

/** The surveys, hubs and schools with answers waiting, for the queue's filters. */
export async function fetchReviewFilterOptions(scope: AdminScope) {
  // One pass over the waiting answers, grouped by all three; each list is summed from it.
  const groups = await withCopyAndSurvey(
    db
      .select({
        surveyId: survey.id,
        surveyLabel: sql<string>`${survey.code} || ' · ' || ${survey.title}`,
        hubId: hub.id,
        hubName: hub.hubName,
        schoolId: school.id,
        schoolName: school.schoolName,
        waiting: count(),
      })
      .from(surveyAnswer)
      .$dynamic(),
  )
    .innerJoin(hub, eq(hub.id, surveyQuestionnaire.hubId))
    .innerJoin(school, eq(school.id, surveyQuestionnaire.schoolId))
    .where(waitingForReview(scope))
    .groupBy(
      survey.id,
      survey.code,
      survey.title,
      hub.id,
      hub.hubName,
      school.id,
      school.schoolName,
    );
  const summed = (key: (group: (typeof groups)[number]) => { id: string; label: string }) => {
    const totals = new Map<string, { id: string; label: string; waiting: number }>();
    for (const group of groups) {
      const { id, label } = key(group);
      const total = totals.get(id) ?? { id, label, waiting: 0 };
      total.waiting += group.waiting;
      totals.set(id, total);
    }
    return [...totals.values()].toSorted((a, b) => a.label.localeCompare(b.label));
  };
  return {
    surveys: summed((group) => ({ id: group.surveyId, label: group.surveyLabel })),
    hubs: summed((group) => ({ id: group.hubId, label: group.hubName })),
    schools: summed((group) => ({ id: group.schoolId, label: group.schoolName })),
  };
}
export type ReviewFilterOptions = Awaited<ReturnType<typeof fetchReviewFilterOptions>>;

/**
 * One answer with everything its review shows: the question, what the pipeline read, the page
 * image to cut it from, and its history. Reviewed answers can be opened too, to correct them.
 * Joined in the core builder rather than a relational query: the scope is a condition on the
 * survey two relations away, and only the answer's own layout page is selected out of the layout.
 */
export async function fetchAnswerForReview(scope: AdminScope, answerId: string) {
  const [answerInScope] = await db
    .select({
      answer: surveyAnswer,
      serial: surveyQuestionnaire.serial,
      copyStatus: surveyQuestionnaire.status,
      schoolName: school.schoolName,
      pageNumber: surveyVersionField.pageNumber,
      form: surveyVersion.form,
      paper: sql<Layout["paper"] | null>`${surveyVersion.layout} -> 'paper'`,
      layoutPage: sql<LayoutPage | null>`jsonb_path_query_first(${surveyVersion.layout}, '$.pages[*] ? (@.number == $n)', jsonb_build_object('n', ${surveyVersionField.pageNumber}))`,
      scanPage: {
        imageS3Key: surveyScanPage.imageS3Key,
        aligned: surveyScanPage.aligned,
      },
    })
    .from(surveyAnswer)
    .innerJoin(
      surveyQuestionnaire,
      and(
        eq(surveyQuestionnaire.id, surveyAnswer.questionnaireId),
        eq(surveyQuestionnaire.versionId, surveyAnswer.versionId),
      ),
    )
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
    .innerJoin(surveyVersion, eq(surveyVersion.id, surveyAnswer.versionId))
    .innerJoin(school, eq(school.id, surveyQuestionnaire.schoolId))
    .innerJoin(
      surveyVersionField,
      and(
        eq(surveyVersionField.versionId, surveyAnswer.versionId),
        eq(surveyVersionField.field, surveyAnswer.field),
      ),
    )
    .leftJoin(surveyScanPage, eq(surveyScanPage.id, surveyAnswer.scanPageId))
    .where(and(eq(surveyAnswer.id, answerId), inScope(scope)));
  if (!answerInScope) {
    return null;
  }
  const question = fieldQuestionOf(answerInScope.form, answerInScope.answer.field);
  const crop =
    answerInScope.layoutPage && answerInScope.paper
      ? fieldCropOf(answerInScope.layoutPage, answerInScope.paper, answerInScope.answer.field)
      : undefined;
  const [image, history] = await Promise.all([
    pageImageOf(answerInScope.scanPage),
    answerHistory(answerId),
  ]);
  return {
    id: answerInScope.answer.id,
    field: answerInScope.answer.field,
    question,
    value: answerInScope.answer.value as AnswerValue | null,
    recognizedValue: answerInScope.answer.recognizedValue as AnswerValue | null,
    readStatus: answerInScope.answer.readStatus,
    readDetail: answerInScope.answer.readDetail,
    flags: answerInScope.answer.flags,
    reviewStatus: answerInScope.answer.reviewStatus,
    reviewedAt: answerInScope.answer.reviewedAt,
    copy: {
      serial: answerInScope.serial,
      status: answerInScope.copyStatus,
      schoolName: answerInScope.schoolName,
      pageNumber: answerInScope.pageNumber,
    },
    // A straightened page is cut to the field; any other is shown whole.
    image: image && { ...image, crop: image.aligned ? crop : undefined },
    history,
  };
}
export type AnswerForReview = NonNullable<Awaited<ReturnType<typeof fetchAnswerForReview>>>;

/**
 * A short-lived link to a scan page's image, made from the key on its row. Callers reach the row
 * only through an answer in the admin's scope, so no key or other page is ever reachable.
 */
async function pageImageOf(
  scanPage: { imageS3Key: string | null; aligned: boolean | null } | null,
) {
  if (!scanPage?.imageS3Key) {
    return null;
  }
  const windowStart = Math.floor(Date.now() / IMAGE_LINK_WINDOW_MS) * IMAGE_LINK_WINDOW_MS;
  const url = await getPresignedUrl(scanPage.imageS3Key, "survey-scans", IMAGE_LINK_SECONDS, {
    signingDate: new Date(windowStart),
  });
  return { url, aligned: scanPage.aligned === true };
}

/** The image link for a queued answer's page, so the next answer's page can load ahead. */
export async function pageImageForAnswer(scope: AdminScope, answerId: string) {
  const [answerPage] = await db
    .select({
      scanPage: {
        imageS3Key: surveyScanPage.imageS3Key,
        aligned: surveyScanPage.aligned,
      },
    })
    .from(surveyAnswer)
    .innerJoin(surveyQuestionnaire, eq(surveyQuestionnaire.id, surveyAnswer.questionnaireId))
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
    .innerJoin(surveyScanPage, eq(surveyScanPage.id, surveyAnswer.scanPageId))
    .where(and(eq(surveyAnswer.id, answerId), inScope(scope)));
  return answerPage ? pageImageOf(answerPage.scanPage) : null;
}

async function answerHistory(answerId: string) {
  return db
    .select({
      id: surveyAuditEvent.id,
      occurredAt: surveyAuditEvent.occurredAt,
      action: surveyAuditEvent.action,
      before: surveyAuditEvent.before,
      after: surveyAuditEvent.after,
      actorName: user.name,
      actorEmail: user.email,
    })
    .from(surveyAuditEvent)
    .leftJoin(user, eq(user.id, surveyAuditEvent.actorUserId))
    .where(
      and(
        eq(surveyAuditEvent.entityType, SurveyAuditEntity.ANSWER),
        eq(surveyAuditEvent.entityId, answerId),
      ),
    )
    .orderBy(asc(surveyAuditEvent.id));
}

export type ReviewDecision = { kind: "accept" } | { kind: "correct"; value: AnswerValue | null };

/** When the reviewer's page last showed the answer reviewed (null: not yet), to catch a race. */
export type SeenReview = { reviewedAt: string | null };

/**
 * Accepts an answer as it stands, or stores a corrected value. Accepting needs its value to keep
 * the form's rules; a blank is always storable, since the paper decides, even for a required
 * question. A correction that, tidied, is the value it already has counts as accepting it, and the
 * stored value is kept as it is. A decision made on a page that showed an older review than the
 * answer now has is refused, so no one's review is overwritten unseen. The copy's status follows:
 * its last answer reviewed makes it READY.
 */
export async function reviewAnswer(
  scope: AdminScope,
  answerId: string,
  decision: ReviewDecision,
  seen: SeenReview,
) {
  return db.transaction(async (tx) => {
    const target = await lockAnswer(tx, scope, answerId);
    const reviewedAt = target.answer.reviewedAt?.toISOString() ?? null;
    if (seen.reviewedAt !== reviewedAt) {
      throw new SurveyError(
        "Someone reviewed this answer while you had it open. Reload to see their decision.",
      );
    }
    const question = fieldQuestionOf(target.form, target.answer.field);
    const rule = answerRulesOf(target.form).get(target.answer.field);
    if (!question || !rule) {
      throw new Error(`The form has no question for field ${target.answer.field}`);
    }
    const current = target.answer.value as AnswerValue | null;
    const corrected = decision.kind === "correct" ? storableValue(decision.value) : current;
    // The same test the page uses to choose between Accept and Save correction.
    const isAcceptance = decision.kind === "accept" || !changesAnswer(corrected, current);
    const proposed = isAcceptance ? current : normalisedAnswer(corrected);
    // An answer accepted automatically was never seen by a person, so it can still be verified.
    if (isAcceptance && reviewedByAPerson(target.answer.reviewStatus)) {
      throw new SurveyError("This answer has already been reviewed");
    }
    const problem = valueProblem(question, rule, proposed);
    if (problem) {
      throw new SurveyError(
        decision.kind === "accept"
          ? `It can't be accepted: ${problem}. Correct it instead.`
          : problem,
      );
    }

    const reviewStatus = isAcceptance
      ? SurveyAnswerReviewStatus.VERIFIED
      : SurveyAnswerReviewStatus.CORRECTED;
    const [reviewed] = await tx
      .update(surveyAnswer)
      .set({
        value: proposed,
        reviewStatus,
        reviewedBy: scope.userId,
        reviewedAt: sql`now()`,
      })
      .where(eq(surveyAnswer.id, answerId))
      .returning({ id: surveyAnswer.id });
    if (!reviewed) throw new Error(`Answer ${answerId} disappeared while locked`);
    await recordSurveyEvent(tx, {
      actor: { kind: SurveyAuditActor.USER, userId: scope.userId },
      entityType: SurveyAuditEntity.ANSWER,
      entityId: answerId,
      surveyId: target.surveyId,
      action: isAcceptance ? SurveyAuditAction.ANSWER_VERIFIED : SurveyAuditAction.ANSWER_CORRECTED,
      before: { value: current, reviewStatus: target.answer.reviewStatus } as JsonValue,
      after: { value: proposed, reviewStatus } as JsonValue,
    });
    await recomputeCopyStatuses(tx, [target.copyId]);
    return { reviewStatus };
  });
}

/** The answer and its copy, locked copy first as ingest locks them, and held to the scope. */
async function lockAnswer(tx: Transaction, scope: AdminScope, answerId: string) {
  const [copy] = await withCopyAndSurvey(
    tx
      .select({ id: surveyQuestionnaire.id, status: surveyQuestionnaire.status })
      .from(surveyAnswer)
      .$dynamic(),
  )
    .where(and(eq(surveyAnswer.id, answerId), inScope(scope)))
    .for("update", { of: surveyQuestionnaire });
  if (!copy) {
    throw new NotFoundError("Answer");
  }
  if (isSettledCopy(copy.status)) {
    throw new SurveyError(
      copy.status === SurveyQuestionnaireStatus.VOID
        ? "This copy is void, so its answers can't change"
        : "This copy is verified, so its answers can't change",
    );
  }
  const [locked] = await tx
    .select({ answer: surveyAnswer, form: surveyVersion.form, surveyId: survey.id })
    .from(surveyAnswer)
    .innerJoin(surveyVersion, eq(surveyVersion.id, surveyAnswer.versionId))
    .innerJoin(survey, eq(survey.id, surveyVersion.surveyId))
    .where(eq(surveyAnswer.id, answerId))
    .for("update", { of: surveyAnswer });
  if (!locked) {
    throw new NotFoundError("Answer");
  }
  return { ...locked, copyId: copy.id };
}

/** Text Postgres can store, as the pipeline's text is: no NUL, no broken Unicode. */
function storableValue(value: AnswerValue | null): AnswerValue | null {
  if (typeof value === "string") return storable(value);
  if (Array.isArray(value)) return value.map(storable);
  return value;
}

/** Why a value can't be stored for this question, in words the reviewer can act on. */
function valueProblem(
  question: FieldQuestion,
  rule: AnswerRule,
  value: AnswerValue | null,
): string | undefined {
  if (value === null) {
    return undefined;
  }
  const input = question.input;
  switch (input.kind) {
    case "choice":
      if (input.multiple ? !Array.isArray(value) : typeof value !== "string") {
        return input.multiple ? "choose one or more options" : "choose one option";
      }
      return keepsFormRule(rule, value) ? undefined : "choose from the printed options";
    case "digits": {
      if (typeof value !== "string" || !/^[0-9]+$/.test(value)) return "use digits only";
      if (value.length > input.digits) return `use at most ${input.digits} digits`;
      return keepsFormRule(rule, value) ? undefined : rangeText(input.min, input.max);
    }
    case "date":
      return typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        keepsFormRule(rule, value)
        ? undefined
        : "enter a real date";
    case "text":
      return typeof value === "string" ? undefined : "enter the text as written";
    case "signature":
      return value === true ? undefined : "mark it signed, or leave it blank";
  }
}

function rangeText(min: number | undefined, max: number | undefined) {
  if (min !== undefined && max !== undefined) return `use a number from ${min} to ${max}`;
  if (min !== undefined) return `use a number of at least ${min}`;
  return `use a number of at most ${max}`;
}
