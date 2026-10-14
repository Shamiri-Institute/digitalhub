import { db } from "#/db/client";
import { countOf } from "#/db/sql";
import { surveyPage, surveyQuestion } from "#/db/schema";
import type { SurveyScope } from "#/lib/auth/admin-access";

/** The surveys of an implementer in a project, newest first, with their latest version. */
export async function fetchSurveys({ implementerId, projectId }: SurveyScope) {
  const surveys = await db.query.survey.findMany({
    where: (s, { and, eq }) => and(eq(s.implementerId, implementerId), eq(s.projectId, projectId)),
    columns: {
      id: true,
      code: true,
      title: true,
      status: true,
      createdAt: true,
    },
    with: {
      versions: {
        columns: { versionNumber: true, status: true },
        orderBy: (v, { desc }) => desc(v.versionNumber),
        limit: 1,
      },
    },
    orderBy: (s, { asc, desc }) => [desc(s.createdAt), asc(s.id)],
  });
  return surveys.map(({ versions, ...rest }) => ({ ...rest, latestVersion: versions[0] ?? null }));
}

export type SurveyListItem = Awaited<ReturnType<typeof fetchSurveys>>[number];

/** One survey with its versions, newest first; undefined outside the caller's scope. */
export async function fetchSurveyWithVersions(
  surveyId: string,
  { implementerId, projectId }: SurveyScope,
) {
  return db.query.survey.findFirst({
    where: (s, { and, eq }) =>
      and(eq(s.id, surveyId), eq(s.implementerId, implementerId), eq(s.projectId, projectId)),
    columns: {
      id: true,
      code: true,
      title: true,
      description: true,
      status: true,
    },
    with: {
      versions: {
        columns: { id: true, versionNumber: true, status: true, createdAt: true },
        extras: (v) => ({
          pageCount: countOf(surveyPage.versionId, v.id).as("page_count"),
          questionCount: countOf(surveyQuestion.versionId, v.id).as("question_count"),
        }),
        with: { basedOnVersion: { columns: { versionNumber: true } } },
        orderBy: (v, { desc }) => desc(v.versionNumber),
      },
    },
  });
}

export type SurveyWithVersions = NonNullable<Awaited<ReturnType<typeof fetchSurveyWithVersions>>>;
export type SurveyVersionRow = SurveyWithVersions["versions"][number];
