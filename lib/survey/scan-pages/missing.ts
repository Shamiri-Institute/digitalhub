import "server-only";

import { and, asc, count, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyQuestionnaireStatus, SurveyScanPageStatus } from "#/db/enums";
import { hub, school, survey, surveyQuestionnaire } from "#/db/schema";
import type { SurveyViewer } from "#/lib/auth/survey-access";
import { inScope } from "#/lib/survey/answer-review";
import { filterOptionsOf } from "#/lib/survey/filter-options";

/** Copies listed at once; filters narrow a longer list. */
const MISSING_PAGES_LIMIT = 200;

export type MissingPagesFilters = { surveyId?: string; hubId?: string; schoolId?: string };

function partialInScope(viewer: SurveyViewer) {
  return and(inScope(viewer), eq(surveyQuestionnaire.status, SurveyQuestionnaireStatus.PARTIAL));
}

/**
 * The viewer's copies with some pages scanned and others not, by survey, hub, school and serial,
 * each with the pages still missing. At most MISSING_PAGES_LIMIT; `total` counts them all.
 */
export async function fetchMissingPages(viewer: SurveyViewer, filters: MissingPagesFilters) {
  const where = and(
    partialInScope(viewer),
    filters.surveyId ? eq(survey.id, filters.surveyId) : undefined,
    filters.hubId ? eq(surveyQuestionnaire.hubId, filters.hubId) : undefined,
    filters.schoolId ? eq(surveyQuestionnaire.schoolId, filters.schoolId) : undefined,
  );
  const [copies, [totals]] = await Promise.all([
    db
      .select({
        id: surveyQuestionnaire.id,
        serial: surveyQuestionnaire.serial,
        survey: { id: survey.id, code: survey.code, title: survey.title },
        hubName: hub.hubName,
        schoolName: school.schoolName,
      })
      .from(surveyQuestionnaire)
      .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
      .innerJoin(hub, eq(hub.id, surveyQuestionnaire.hubId))
      .innerJoin(school, eq(school.id, surveyQuestionnaire.schoolId))
      .where(where)
      .orderBy(
        asc(survey.code),
        asc(hub.hubName),
        asc(school.schoolName),
        asc(surveyQuestionnaire.serialNumber),
      )
      .limit(MISSING_PAGES_LIMIT),
    db
      .select({ total: count() })
      .from(surveyQuestionnaire)
      .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
      .where(where),
  ]);

  const printedPages =
    copies.length === 0
      ? []
      : await db.query.surveyQuestionnairePage.findMany({
          columns: { questionnaireId: true, pageNumber: true, code: true },
          where: (page, { inArray }) =>
            inArray(
              page.questionnaireId,
              copies.map((copy) => copy.id),
            ),
          orderBy: (page, { asc }) => [asc(page.questionnaireId), asc(page.pageNumber)],
          with: {
            scans: {
              columns: { createdAt: true },
              where: (scan, { eq }) => eq(scan.status, SurveyScanPageStatus.MATCHED),
            },
          },
        });
  const pagesByCopy = Map.groupBy(printedPages, (page) => page.questionnaireId);
  return {
    total: totals?.total ?? 0,
    limit: MISSING_PAGES_LIMIT,
    copies: copies.map((copy) => {
      const pages = pagesByCopy.get(copy.id) ?? [];
      const scannedAt = pages.flatMap((page) => page.scans.map((scan) => scan.createdAt.getTime()));
      return {
        ...copy,
        printedPages: pages.length,
        missingPages: pages
          .filter((page) => page.scans.length === 0)
          .map(({ pageNumber, code }) => ({ pageNumber, code })),
        lastScannedAt: scannedAt.length > 0 ? new Date(Math.max(...scannedAt)) : null,
      };
    }),
  };
}
export type MissingPages = Awaited<ReturnType<typeof fetchMissingPages>>;
export type CopyMissingPages = MissingPages["copies"][number];

/** The surveys, hubs and schools with copies missing pages, for the list's filters. */
export async function fetchMissingPagesFilterOptions(viewer: SurveyViewer) {
  const groups = await db
    .select({
      surveyId: survey.id,
      surveyLabel: sql<string>`${survey.code} || ' · ' || ${survey.title}`,
      hubId: hub.id,
      hubName: hub.hubName,
      schoolId: school.id,
      schoolName: school.schoolName,
      count: count(),
    })
    .from(surveyQuestionnaire)
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
    .innerJoin(hub, eq(hub.id, surveyQuestionnaire.hubId))
    .innerJoin(school, eq(school.id, surveyQuestionnaire.schoolId))
    .where(partialInScope(viewer))
    .groupBy(
      survey.id,
      survey.code,
      survey.title,
      hub.id,
      hub.hubName,
      school.id,
      school.schoolName,
    );
  return filterOptionsOf(viewer.kind, groups);
}
export type MissingPagesFilterOptions = Awaited<ReturnType<typeof fetchMissingPagesFilterOptions>>;
