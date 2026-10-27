import { db } from "#/db/client";
import type { SurveyScope } from "#/lib/auth/admin-access";
import { SurveyVersionStatus } from "#/db/enums";
import { lockedQuestions } from "#/lib/survey/check-form";
import { summarizeForm } from "#/lib/survey/form";
import type { Layout } from "#/lib/survey/layout";

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

/**
 * One version of a survey with its form (and, once published, its prefill and print layout), for
 * the builder, and the questions its survey's published and retired versions lock; undefined
 * outside the caller's scope or for an unknown number.
 */
export async function fetchVersionForBuilder(
  surveyId: string,
  versionNumber: number,
  { implementerId, projectId }: SurveyScope,
) {
  const found = await db.query.survey.findFirst({
    where: (s, { and, eq }) =>
      and(eq(s.id, surveyId), eq(s.implementerId, implementerId), eq(s.projectId, projectId)),
    columns: { id: true, code: true, title: true },
    with: {
      // Only the forms needed: this version's, and the published ones that lock keys.
      versions: {
        columns: {
          id: true,
          versionNumber: true,
          status: true,
          revision: true,
          form: true,
          prefill: true,
        },
        // Only the viewed version's print layout; the published ones are here for their forms.
        extras: (v, { sql }) => ({
          layout:
            sql<Layout | null>`case when ${v.versionNumber} = ${versionNumber} then ${v.layout} end`.as(
              "layout",
            ),
        }),
        where: (v, { eq, ne, or }) =>
          or(eq(v.versionNumber, versionNumber), ne(v.status, SurveyVersionStatus.DRAFT)),
        orderBy: (v, { desc }) => desc(v.versionNumber),
      },
    },
  });
  const version = found?.versions.find((v) => v.versionNumber === versionNumber);
  return (
    found &&
    version && {
      survey: { id: found.id, code: found.code, title: found.title },
      version,
      locked: lockedQuestions(found.versions.filter((v) => v.status !== SurveyVersionStatus.DRAFT)),
    }
  );
}

export type BuilderData = NonNullable<Awaited<ReturnType<typeof fetchVersionForBuilder>>>;
