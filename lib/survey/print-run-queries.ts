// What the print-run pages read, for a hub coordinator or a Research admin. Every query takes a
// PrintRunViewer, which has no unscoped kind, so each one is filtered to what its viewer may see.

import { and, eq, inArray, max, min, type SQL, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyStatus, SurveyVersionStatus } from "#/db/enums";
import { student, survey, surveyPrintRun, surveyQuestionnaire, surveyVersion } from "#/db/schema";
import { countOf } from "#/db/sql";
import type { PrintRunViewer } from "#/lib/auth/survey-access";

const COPIES_PER_PAGE = 200;

function versionsInProject(viewer: PrintRunViewer) {
  return db
    .select({ id: surveyVersion.id })
    .from(surveyVersion)
    .innerJoin(survey, eq(survey.id, surveyVersion.surveyId))
    .where(
      and(eq(survey.implementerId, viewer.implementerId), eq(survey.projectId, viewer.projectId)),
    );
}

function runVisibleTo(
  run: { hubId: typeof surveyPrintRun.hubId; versionId: typeof surveyPrintRun.versionId },
  viewer: PrintRunViewer,
): SQL {
  return viewer.kind === "hub"
    ? eq(run.hubId, viewer.hubId)
    : inArray(run.versionId, versionsInProject(viewer));
}

/** Published versions with a print layout, of the viewer's active surveys. */
export async function fetchPrintableVersions(viewer: PrintRunViewer, surveyId?: string) {
  const surveys = await db.query.survey.findMany({
    where: (s, { and, eq }) =>
      and(
        eq(s.implementerId, viewer.implementerId),
        eq(s.projectId, viewer.projectId),
        eq(s.status, SurveyStatus.ACTIVE),
        surveyId === undefined ? undefined : eq(s.id, surveyId),
      ),
    columns: { id: true, code: true, title: true },
    with: {
      versions: {
        where: (v, { and, eq, isNotNull }) =>
          and(eq(v.status, SurveyVersionStatus.PUBLISHED), isNotNull(v.layout)),
        columns: { id: true, versionNumber: true, prefill: true },
        orderBy: (v, { desc }) => desc(v.versionNumber),
      },
    },
    orderBy: (s, { asc }) => [asc(s.title), asc(s.id)],
  });
  return surveys.flatMap(({ versions, ...printedSurvey }) =>
    versions.flatMap(({ prefill, ...version }) =>
      prefill ? [{ ...version, prefill, survey: printedSurvey }] : [],
    ),
  );
}

export type PrintableVersions = Awaited<ReturnType<typeof fetchPrintableVersions>>;

/**
 * The hubs the viewer may print for (a coordinator's own; an admin's unarchived hubs of their
 * project), each with its active schools and their active students.
 */
export async function fetchPrintableHubs(viewer: PrintRunViewer) {
  return db.query.hub.findMany({
    where: (h, { and, eq, isNull }) =>
      viewer.kind === "hub"
        ? eq(h.id, viewer.hubId)
        : and(
            eq(h.implementerId, viewer.implementerId),
            eq(h.projectId, viewer.projectId),
            isNull(h.archivedAt),
          ),
    columns: { id: true, hubName: true },
    with: {
      schools: {
        where: (s, { isNull }) => isNull(s.archivedAt),
        columns: { id: true, schoolName: true },
        extras: (s) => ({
          activeStudents: countOf(
            student.schoolId,
            s.id,
            sql`"students"."archived_at" is null and "students"."dropped_out" is not true`,
          ).as("active_students"),
        }),
        orderBy: (s, { asc }) => [asc(s.schoolName), asc(s.id)],
      },
    },
    orderBy: (h, { asc }) => [asc(h.hubName), asc(h.id)],
  });
}

export type PrintableHubs = Awaited<ReturnType<typeof fetchPrintableHubs>>;

/** The viewer's print runs, newest first, optionally of one survey. */
export async function fetchPrintRuns(viewer: PrintRunViewer, surveyId?: string) {
  return db.query.surveyPrintRun.findMany({
    where: (r, { and, inArray }) =>
      and(
        runVisibleTo(r, viewer),
        surveyId === undefined
          ? undefined
          : inArray(
              r.versionId,
              db
                .select({ id: surveyVersion.id })
                .from(surveyVersion)
                .where(eq(surveyVersion.surveyId, surveyId)),
            ),
      ),
    columns: { id: true, createdAt: true, copyCount: true, status: true },
    with: {
      version: {
        columns: { versionNumber: true },
        with: { survey: { columns: { id: true, code: true, title: true } } },
      },
      hub: { columns: { hubName: true } },
    },
    orderBy: (r, { desc }) => [desc(r.createdAt), desc(r.id)],
  });
}

export type PrintRunRows = Awaited<ReturnType<typeof fetchPrintRuns>>;

/** One run the viewer may see, with its serial range; undefined otherwise. */
export async function fetchPrintRun(viewer: PrintRunViewer, printRunId: string) {
  const run = await db.query.surveyPrintRun.findFirst({
    where: (r, { and, eq }) => and(eq(r.id, printRunId), runVisibleTo(r, viewer)),
    columns: { id: true, createdAt: true, copyCount: true, status: true },
    with: {
      version: {
        columns: { versionNumber: true, prefill: true },
        with: { survey: { columns: { id: true, code: true, title: true } } },
      },
      hub: { columns: { hubName: true } },
      requestedByUser: { columns: { name: true, email: true } },
    },
  });
  if (!run) {
    return;
  }
  const [serials] = await db
    .select({
      first: min(surveyQuestionnaire.serial),
      last: max(surveyQuestionnaire.serial),
    })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.printRunId, run.id));
  return { ...run, firstSerial: serials?.first ?? null, lastSerial: serials?.last ?? null };
}

export type PrintRunDetail = NonNullable<Awaited<ReturnType<typeof fetchPrintRun>>>;

/** One page of a run's copies, in serial order, with their page codes. */
export async function fetchPrintRunCopies(
  viewer: PrintRunViewer,
  printRunId: string,
  page: number,
) {
  const visibleRun = db
    .select({ id: surveyPrintRun.id })
    .from(surveyPrintRun)
    .where(and(eq(surveyPrintRun.id, printRunId), runVisibleTo(surveyPrintRun, viewer)));
  const [copies, total] = await Promise.all([
    db.query.surveyQuestionnaire.findMany({
      where: (q, { inArray }) => inArray(q.printRunId, visibleRun),
      columns: { id: true, serial: true, status: true },
      with: {
        school: { columns: { schoolName: true } },
        student: { columns: { studentName: true, admissionNumber: true } },
        pages: { columns: { code: true }, orderBy: (p, { asc }) => asc(p.pageNumber) },
      },
      orderBy: (q, { asc }) => asc(q.serial),
      limit: COPIES_PER_PAGE,
      offset: (page - 1) * COPIES_PER_PAGE,
    }),
    db.$count(surveyQuestionnaire, inArray(surveyQuestionnaire.printRunId, visibleRun)),
  ]);
  return { copies, pageCount: Math.max(1, Math.ceil(total / COPIES_PER_PAGE)) };
}

export type PrintRunCopies = Awaited<ReturnType<typeof fetchPrintRunCopies>>;
export type PrintRunCopy = PrintRunCopies["copies"][number];
