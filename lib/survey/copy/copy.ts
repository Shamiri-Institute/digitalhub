import "server-only";

import { type AnyColumn, and, asc, count, eq, inArray, max, or } from "drizzle-orm";
import { z } from "zod";

import { db, type Transaction } from "#/db/client";
import {
  SurveyAnswerReviewStatus,
  SurveyAuditActor,
  type SurveyQuestionnaireStatus,
  SurveyScanPageStatus,
  SurveyScanRejection,
} from "#/db/enums";
import {
  hub,
  school,
  student,
  survey,
  surveyAnswer,
  surveyAuditEvent,
  surveyPrintRun,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyScanPage,
  surveyVersion,
} from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { type AnswerValue, fieldQuestionsOf, formatAnswer } from "#/lib/survey/answer-fields";
import { inScope, pageImageOf } from "#/lib/survey/answer-review";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import {
  type CopyCommand,
  type CopyDecision,
  type CopyFacts,
  type CopyRefusal,
  decideCopyAction,
} from "#/lib/survey/copy/decide";

export type CopyCommandResult =
  | { kind: "changed"; from: SurveyQuestionnaireStatus; to: SurveyQuestionnaireStatus }
  | { kind: "unchanged"; because: Extract<CopyDecision, { kind: "unchanged" }>["because"] }
  | { kind: "refused"; refusal: CopyRefusal }
  | { kind: "not-found" };

/**
 * The copy row is locked before its pages and answers are counted, so a scan or review that lands
 * meanwhile waits, and the decision rests on the counts rather than the stored status. Answers are
 * left as they are.
 */
export async function applyCopyCommand(
  tx: Transaction,
  viewer: SurveyViewer,
  copyId: string,
  command: CopyCommand,
): Promise<CopyCommandResult> {
  const [copy] = await tx
    .select({
      id: surveyQuestionnaire.id,
      status: surveyQuestionnaire.status,
      serial: surveyQuestionnaire.serial,
      surveyId: surveyQuestionnaire.surveyId,
    })
    .from(surveyQuestionnaire)
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
    .where(and(eq(surveyQuestionnaire.id, copyId), inScope(viewer)))
    .for("update", { of: surveyQuestionnaire });
  if (!copy) {
    return { kind: "not-found" };
  }
  // A separate statement after the lock: under READ COMMITTED it sees every scan and review that
  // committed before the lock was granted.
  const facts = await factsOf(tx, copy, command);
  const decision = decideCopyAction(facts, command.kind, viewer.kind);
  if (decision.kind === "unchanged") return { kind: "unchanged", because: decision.because };
  if (decision.kind === "refused") return { kind: "refused", refusal: decision.refusal };

  const [changed] = await tx
    .update(surveyQuestionnaire)
    .set({ status: decision.to })
    .where(eq(surveyQuestionnaire.id, copy.id))
    .returning({ id: surveyQuestionnaire.id });
  if (!changed) {
    throw new Error(`Questionnaire ${copy.serial} disappeared while locked`);
  }
  await recordSurveyEvent(tx, {
    actor: { kind: SurveyAuditActor.USER, userId: viewer.userId },
    surveyId: copy.surveyId,
    entityType: SurveyAuditEntity.QUESTIONNAIRE,
    entityId: copy.id,
    action:
      command.kind === "verify"
        ? SurveyAuditAction.QUESTIONNAIRE_VERIFIED
        : SurveyAuditAction.QUESTIONNAIRE_REOPENED,
    before: { status: copy.status, serial: copy.serial },
    after: { status: decision.to, serial: copy.serial },
    reason: command.kind === "reopen" ? command.reason : undefined,
  });
  return { kind: "changed", from: copy.status, to: decision.to };
}

async function factsOf(
  tx: Transaction,
  copy: { id: string; status: SurveyQuestionnaireStatus },
  command: CopyCommand,
): Promise<CopyFacts> {
  const printed = await tx
    .select({ pageNumber: surveyQuestionnairePage.pageNumber, matchedScanId: surveyScanPage.id })
    .from(surveyQuestionnairePage)
    .leftJoin(
      surveyScanPage,
      and(
        eq(surveyScanPage.questionnairePageId, surveyQuestionnairePage.id),
        eq(surveyScanPage.status, SurveyScanPageStatus.MATCHED),
      ),
    )
    .where(eq(surveyQuestionnairePage.questionnaireId, copy.id))
    .orderBy(asc(surveyQuestionnairePage.pageNumber));
  const [waiting] = await tx
    .select({ count: count() })
    .from(surveyAnswer)
    .where(
      and(
        eq(surveyAnswer.questionnaireId, copy.id),
        eq(surveyAnswer.reviewStatus, SurveyAnswerReviewStatus.NEEDS_REVIEW),
      ),
    );
  const [newest] = await tx
    .select({ id: max(surveyAuditEvent.id) })
    .from(surveyAuditEvent)
    .where(inCopyHistory(surveyAuditEvent, copy.id));
  return {
    status: copy.status,
    printedPages: printed.length,
    missingPageNumbers: printed
      .filter((page) => page.matchedScanId === null)
      .map((page) => page.pageNumber),
    answersNeedingReview: waiting?.count ?? 0,
    changedSinceSeen: command.seenEventId !== (newest?.id ?? null),
  };
}

/** The copy's own events and those of its answers: what its page lists as history. */
function inCopyHistory(event: { entityType: AnyColumn; entityId: AnyColumn }, copyId: string) {
  return or(
    and(eq(event.entityType, SurveyAuditEntity.QUESTIONNAIRE), eq(event.entityId, copyId)),
    and(
      eq(event.entityType, SurveyAuditEntity.ANSWER),
      inArray(
        event.entityId,
        db
          .select({ id: surveyAnswer.id })
          .from(surveyAnswer)
          .where(eq(surveyAnswer.questionnaireId, copyId)),
      ),
    ),
  );
}

/** Null when the copy is missing or outside the viewer's scope, alike. */
export async function loadCopy(viewer: SurveyViewer, copyId: string) {
  // Joined in the core builder rather than a relational query: `inScope` is written against the
  // imported survey and copy tables, shared with the review queue, so it can't go in a relational
  // `where`.
  const [header] = await db
    .select({
      id: surveyQuestionnaire.id,
      serial: surveyQuestionnaire.serial,
      status: surveyQuestionnaire.status,
      survey: { id: survey.id, title: survey.title, code: survey.code },
      versionNumber: surveyVersion.versionNumber,
      form: surveyVersion.form,
      hubName: hub.hubName,
      schoolName: school.schoolName,
      studentName: student.studentName,
      admissionNumber: student.admissionNumber,
      printRun: { id: surveyPrintRun.id, createdAt: surveyPrintRun.createdAt },
    })
    .from(surveyQuestionnaire)
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
    .innerJoin(surveyVersion, eq(surveyVersion.id, surveyQuestionnaire.versionId))
    .innerJoin(surveyPrintRun, eq(surveyPrintRun.id, surveyQuestionnaire.printRunId))
    .innerJoin(hub, eq(hub.id, surveyQuestionnaire.hubId))
    .innerJoin(school, eq(school.id, surveyQuestionnaire.schoolId))
    .leftJoin(student, eq(student.id, surveyQuestionnaire.studentId))
    .where(and(eq(surveyQuestionnaire.id, copyId), inScope(viewer)));
  if (!header) {
    return null;
  }

  // History first: a change that lands while the pages and answers are read is then newer than
  // the newest event the page shows, so a verify or reopen sent from it is refused, never the
  // other way round.
  const events = await copyEvents(header.id);
  const [printedPages, answers] = await Promise.all([
    copyPrintedPages(header.id),
    copyAnswers(header.id),
  ]);
  const questions = fieldQuestionsOf(header.form);
  const printedOrder = [...questions.keys()];
  const answerViews = answers
    .map((answer) => {
      const question = questions.get(answer.field);
      return {
        id: answer.id,
        field: answer.field,
        pageNumber: answer.versionField.pageNumber,
        prompt: question?.prompt ?? answer.field,
        rowLabel: question?.rowLabel,
        valueText: question
          ? formatAnswer(question.input, answer.value as AnswerValue | null)
          : JSON.stringify(answer.value),
        isBlank: answer.value === null,
        reviewStatus: answer.reviewStatus,
        reviewer: shownPerson(answer.reviewedByUser, viewer),
      };
    })
    .toSorted((a, b) => printedOrder.indexOf(a.field) - printedOrder.indexOf(b.field));
  const answerLabels = new Map(
    answerViews.map((answer) => [answer.id, answer.rowLabel ?? answer.prompt]),
  );

  const pages = await Promise.all(
    printedPages.map(async ({ pageNumber, code, scans }) => {
      const matched = scans.find((scan) => scan.status === SurveyScanPageStatus.MATCHED);
      return {
        pageNumber,
        code,
        scan: matched ? { image: await pageImageOf(matched), receivedAt: matched.createdAt } : null,
        answers: answerViews.filter((answer) => answer.pageNumber === pageNumber),
      };
    }),
  );
  const rejectedScans = await Promise.all(
    printedPages.flatMap(({ pageNumber, code, scans }) =>
      scans
        .filter((scan) => scan.status === SurveyScanPageStatus.REJECTED)
        .map(async (scan) => ({
          id: scan.id,
          pageNumber,
          code,
          image: await pageImageOf(scan),
          receivedAt: scan.createdAt,
          fileName: scan.upload.fileName,
        })),
    ),
  );

  const answersNeedingReview = answerViews.filter(
    (answer) => answer.reviewStatus === SurveyAnswerReviewStatus.NEEDS_REVIEW,
  );
  const facts: CopyFacts = {
    status: header.status,
    printedPages: pages.length,
    missingPageNumbers: pages.filter((page) => !page.scan).map((page) => page.pageNumber),
    answersNeedingReview: answersNeedingReview.length,
    // The page is what its viewer sees, so it is never behind itself.
    changedSinceSeen: false,
  };
  const { form: _, studentName, admissionNumber, ...copy } = header;
  return {
    ...copy,
    student: studentName ? { name: studentName, admissionNumber } : null,
    pages,
    rejectedScans,
    facts,
    answersNeedingReview,
    history: events.map(({ actorUser, ...event }) => ({
      ...event,
      actor: shownPerson(actorUser, viewer),
      answerLabel:
        event.entityType === SurveyAuditEntity.ANSWER
          ? (answerLabels.get(event.entityId) ?? null)
          : null,
      placedPage:
        event.action === SurveyAuditAction.QUESTIONNAIRE_PAGE_PLACED
          ? (PlacedPage.safeParse(event.after).data ?? null)
          : null,
    })),
    actions: {
      verify: decideCopyAction(facts, "verify", viewer.kind),
      reopen: decideCopyAction(facts, "reopen", viewer.kind),
    },
  };
}
export type CopyView = NonNullable<Awaited<ReturnType<typeof loadCopy>>>;

/** What a placement's audit event says about the page, as placeScanPage writes it. */
const PlacedPage = z.object({ pageNumber: z.int() });

export type ShownPerson =
  | { kind: "viewer" }
  | { kind: "named"; name: string }
  | { kind: "unnamed" };

/**
 * Who acted, as this viewer may see them. A hub coordinator sees names only, never addresses, so a
 * person without a name stays unnamed to them; the Research team sees the address instead.
 */
function shownPerson(
  person: { id: string; name: string | null; email: string | null } | null,
  viewer: SurveyViewer,
): ShownPerson {
  if (!person) return { kind: "unnamed" };
  if (person.id === viewer.userId) return { kind: "viewer" };
  const name = person.name || (viewer.kind === "project" ? person.email : null);
  return name ? { kind: "named", name } : { kind: "unnamed" };
}
export type CopyPage = CopyView["pages"][number];
export type CopyAnswer = CopyPage["answers"][number];
export type CopyHistoryEvent = CopyView["history"][number];

async function copyPrintedPages(copyId: string) {
  return db.query.surveyQuestionnairePage.findMany({
    columns: { pageNumber: true, code: true },
    where: (page, { eq }) => eq(page.questionnaireId, copyId),
    orderBy: (page, { asc }) => asc(page.pageNumber),
    with: {
      scans: {
        columns: { id: true, status: true, imageS3Key: true, aligned: true, createdAt: true },
        where: (scan, { and, eq, or }) =>
          or(
            eq(scan.status, SurveyScanPageStatus.MATCHED),
            and(
              eq(scan.status, SurveyScanPageStatus.REJECTED),
              eq(scan.rejectedReason, SurveyScanRejection.VERIFIED_COPY),
            ),
          ),
        orderBy: (scan, { asc }) => asc(scan.createdAt),
        with: { upload: { columns: { fileName: true } } },
      },
    },
  });
}

async function copyAnswers(copyId: string) {
  return db.query.surveyAnswer.findMany({
    columns: { id: true, field: true, value: true, reviewStatus: true },
    where: (answer, { eq }) => eq(answer.questionnaireId, copyId),
    orderBy: (answer, { asc }) => asc(answer.field),
    with: {
      versionField: { columns: { pageNumber: true } },
      // The address only reaches the page through shownPerson, for the Research team.
      reviewedByUser: { columns: { id: true, name: true, email: true } },
    },
  });
}

async function copyEvents(copyId: string) {
  return db.query.surveyAuditEvent.findMany({
    columns: {
      id: true,
      occurredAt: true,
      entityType: true,
      entityId: true,
      action: true,
      before: true,
      after: true,
      reason: true,
    },
    where: (event) => inCopyHistory(event, copyId),
    orderBy: (event, { desc }) => desc(event.id),
    with: { actorUser: { columns: { id: true, name: true, email: true } } },
  });
}
