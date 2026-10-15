import { db } from "#/db/client";
import type { SurveyScope } from "#/lib/auth/admin-access";
import { summarizeForm } from "#/lib/survey/form";

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

/**
 * One survey with its versions, newest first, each with its page and question counts; undefined
 * outside the caller's scope. The forms themselves stay on the server.
 */
export async function fetchSurveyWithVersions(
  surveyId: string,
  { implementerId, projectId }: SurveyScope,
) {
  const found = await db.query.survey.findFirst({
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
        columns: { id: true, versionNumber: true, status: true, createdAt: true, form: true },
        with: { basedOnVersion: { columns: { versionNumber: true } } },
        orderBy: (v, { desc }) => desc(v.versionNumber),
      },
    },
  });
  return (
    found && {
      ...found,
      versions: found.versions.map(({ form, ...version }) => ({
        ...version,
        ...summarizeForm(form),
      })),
    }
  );
}

export type SurveyWithVersions = NonNullable<Awaited<ReturnType<typeof fetchSurveyWithVersions>>>;
export type SurveyVersionRow = SurveyWithVersions["versions"][number];
