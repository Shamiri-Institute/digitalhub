import { and, asc, eq, exists, ne, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyAnswerReviewStatus, SurveyQuestionnaireStatus } from "#/db/enums";
import { hub, school, survey, surveyAnswer, surveyQuestionnaire } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";

const copiesWith = (condition: ReturnType<typeof sql>) =>
  sql<number>`count(*) filter (where ${condition})::int`.mapWith(Number);

/**
 * How far each school's printed copies have come back, per survey: a hub coordinator's hub only, a
 * Research admin every hub of their implementer and project. Voided copies are left out.
 */
export async function fetchSurveyProgress(viewer: SurveyViewer, surveyId?: string) {
  const copyNeedsReview = exists(
    db
      .select({ id: surveyAnswer.id })
      .from(surveyAnswer)
      .where(
        and(
          eq(surveyAnswer.questionnaireId, surveyQuestionnaire.id),
          eq(surveyAnswer.reviewStatus, SurveyAnswerReviewStatus.NEEDS_REVIEW),
        ),
      ),
  );
  return db
    .select({
      surveyId: survey.id,
      surveyCode: survey.code,
      surveyTitle: survey.title,
      hubId: hub.id,
      hubName: hub.hubName,
      schoolId: school.id,
      schoolName: school.schoolName,
      issued: sql<number>`count(*)::int`.mapWith(Number),
      returned: copiesWith(
        sql`${surveyQuestionnaire.status} <> ${SurveyQuestionnaireStatus.ISSUED}`,
      ),
      missingPages: copiesWith(
        sql`${surveyQuestionnaire.status} = ${SurveyQuestionnaireStatus.PARTIAL}`,
      ),
      needsReview: copiesWith(copyNeedsReview),
      ready: copiesWith(sql`${surveyQuestionnaire.status} = ${SurveyQuestionnaireStatus.READY}`),
      verified: copiesWith(
        sql`${surveyQuestionnaire.status} = ${SurveyQuestionnaireStatus.VERIFIED}`,
      ),
    })
    .from(surveyQuestionnaire)
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
    .innerJoin(hub, eq(hub.id, surveyQuestionnaire.hubId))
    .innerJoin(school, eq(school.id, surveyQuestionnaire.schoolId))
    .where(
      and(
        ne(surveyQuestionnaire.status, SurveyQuestionnaireStatus.VOID),
        eq(survey.implementerId, viewer.implementerId),
        eq(survey.projectId, viewer.projectId),
        viewer.kind === "hub" ? eq(surveyQuestionnaire.hubId, viewer.hubId) : undefined,
        surveyId === undefined ? undefined : eq(survey.id, surveyId),
      ),
    )
    .groupBy(survey.id, hub.id, school.id)
    .orderBy(asc(survey.title), asc(hub.hubName), asc(school.schoolName), asc(school.id));
}

export type SurveyProgressRows = Awaited<ReturnType<typeof fetchSurveyProgress>>;
export type SurveyProgressRow = SurveyProgressRows[number];

export const PROGRESS_COUNTS = [
  "issued",
  "returned",
  "missingPages",
  "needsReview",
  "ready",
  "verified",
] as const;
export type ProgressCounts = Record<(typeof PROGRESS_COUNTS)[number], number>;

export function progressTotals(rows: readonly ProgressCounts[]): ProgressCounts {
  const totals = Object.fromEntries(PROGRESS_COUNTS.map((count) => [count, 0])) as ProgressCounts;
  for (const schoolCounts of rows) {
    for (const count of PROGRESS_COUNTS) {
      totals[count] += schoolCounts[count];
    }
  }
  return totals;
}

/** The rows grouped by survey, in the order they came. */
export function progressBySurvey(rows: SurveyProgressRows) {
  const surveys = new Map<
    string,
    { surveyId: string; surveyCode: string; surveyTitle: string; schools: SurveyProgressRow[] }
  >();
  for (const schoolProgress of rows) {
    const surveyProgress = surveys.get(schoolProgress.surveyId) ?? {
      surveyId: schoolProgress.surveyId,
      surveyCode: schoolProgress.surveyCode,
      surveyTitle: schoolProgress.surveyTitle,
      schools: [],
    };
    surveyProgress.schools.push(schoolProgress);
    surveys.set(schoolProgress.surveyId, surveyProgress);
  }
  return [...surveys.values()];
}
