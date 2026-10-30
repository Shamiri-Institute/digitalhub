// What the print-run pages read, for a hub coordinator or a Research admin. Every query takes a
// PrintRunViewer, which has no unscoped kind, so each one is filtered to what its viewer may see.

import { and, eq, inArray, type SQL, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { SurveyPrintStatus, SurveyStatus, SurveyVersionStatus } from "#/db/enums";
import { student, survey, surveyPrintFile, surveyPrintRun, surveyVersion } from "#/db/schema";
import { countOf } from "#/db/sql";
import type { PrintRunViewer } from "#/lib/auth/survey-access";
import { activeSchool, activeStudent, studentPrintOrder } from "#/lib/survey/print-run";
import { serialRangeOf } from "#/lib/survey/serial";

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
export async function fetchPrintableVersions(viewer: PrintRunViewer) {
  const surveys = await db.query.survey.findMany({
    where: (s, { and, eq }) =>
      and(
        eq(s.implementerId, viewer.implementerId),
        eq(s.projectId, viewer.projectId),
        eq(s.status, SurveyStatus.ACTIVE),
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
        where: (s) => activeSchool(s),
        columns: { id: true, schoolName: true },
        extras: (s) => ({
          activeStudents: countOf(student.schoolId, s.id, activeStudent()).as("active_students"),
        }),
        orderBy: (s, { asc }) => [asc(s.schoolName), asc(s.id)],
      },
    },
    orderBy: (h, { asc }) => [asc(h.hubName), asc(h.id)],
  });
}

export type PrintableHubs = Awaited<ReturnType<typeof fetchPrintableHubs>>;

/** A school's active students in the order their copies print, if it is an active school of the hub. */
export async function fetchPrintableStudents(printHubId: string, schoolId: string) {
  const schoolInHub = await db.query.school.findFirst({
    where: (s, { and, eq }) => and(eq(s.id, schoolId), eq(s.hubId, printHubId), activeSchool(s)),
    columns: { id: true },
  });
  if (!schoolInHub) {
    return;
  }
  return db
    .select({
      id: student.id,
      studentName: student.studentName,
      admissionNumber: student.admissionNumber,
    })
    .from(student)
    .where(and(eq(student.schoolId, schoolInHub.id), activeStudent()))
    .orderBy(...studentPrintOrder());
}

export type PrintableStudents = NonNullable<Awaited<ReturnType<typeof fetchPrintableStudents>>>;

/** How many of a run's files are at each status, counted in a query's `extras`. */
function fileCountsOf(runId: typeof surveyPrintRun.id) {
  const withStatus = (status: SurveyPrintStatus) =>
    countOf(
      surveyPrintFile.printRunId,
      runId,
      sql.raw(`"survey_print_files"."status" = '${status}'`),
    );
  return {
    files: countOf(surveyPrintFile.printRunId, runId).as("files"),
    queuedFiles: withStatus(SurveyPrintStatus.QUEUED).as("queued_files"),
    readyFiles: withStatus(SurveyPrintStatus.READY).as("ready_files"),
    failedFiles: withStatus(SurveyPrintStatus.FAILED).as("failed_files"),
  };
}

/**
 * A run's status, from its files': ready when all are, queued until one starts, failed when the
 * rest are ready but some failed, and rendering in between.
 */
export function printRunStatusOf(counts: {
  files: number;
  queuedFiles: number;
  readyFiles: number;
  failedFiles: number;
}): SurveyPrintStatus {
  if (counts.readyFiles === counts.files) {
    return SurveyPrintStatus.READY;
  }
  if (counts.queuedFiles === counts.files) {
    return SurveyPrintStatus.QUEUED;
  }
  if (counts.failedFiles > 0 && counts.failedFiles + counts.readyFiles === counts.files) {
    return SurveyPrintStatus.FAILED;
  }
  return SurveyPrintStatus.RENDERING;
}

export async function fetchPrintRuns(viewer: PrintRunViewer, surveyId?: string) {
  const runs = await db.query.surveyPrintRun.findMany({
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
    columns: { id: true, createdAt: true, copyCount: true },
    extras: (r) => fileCountsOf(r.id),
    with: {
      version: {
        columns: { versionNumber: true },
        with: { survey: { columns: { id: true, code: true, title: true } } },
      },
      hub: { columns: { hubName: true } },
    },
    orderBy: (r, { desc }) => [desc(r.createdAt), desc(r.id)],
  });
  return runs.map((run) => ({ ...run, status: printRunStatusOf(run) }));
}

export type PrintRunRows = Awaited<ReturnType<typeof fetchPrintRuns>>;

export async function fetchPrintRun(viewer: PrintRunViewer, printRunId: string) {
  const run = await db.query.surveyPrintRun.findFirst({
    where: (r, { and, eq }) => and(eq(r.id, printRunId), runVisibleTo(r, viewer)),
    columns: {
      id: true,
      createdAt: true,
      copyCount: true,
      firstSerialNumber: true,
    },
    with: {
      version: {
        columns: { versionNumber: true, prefill: true },
        with: { survey: { columns: { id: true, code: true, title: true } } },
      },
      hub: { columns: { hubName: true } },
      requestedByUser: { columns: { name: true, email: true } },
      files: {
        columns: {
          id: true,
          schoolId: true,
          partNumber: true,
          firstSerialNumber: true,
          copyCount: true,
          status: true,
          byteSize: true,
        },
        with: { school: { columns: { schoolName: true } } },
        orderBy: (f, { asc }) => asc(f.firstSerialNumber),
      },
    },
  });
  if (!run) {
    return;
  }
  const count = (status: SurveyPrintStatus) =>
    run.files.filter((file) => file.status === status).length;
  const status = printRunStatusOf({
    files: run.files.length,
    queuedFiles: count(SurveyPrintStatus.QUEUED),
    readyFiles: count(SurveyPrintStatus.READY),
    failedFiles: count(SurveyPrintStatus.FAILED),
  });
  const { code } = run.version.survey;
  const files = run.files.map((file) => ({ ...file, ...serialRangeOf(code, file) }));
  return { ...run, ...serialRangeOf(code, run), status, files };
}

export type PrintRunDetail = NonNullable<Awaited<ReturnType<typeof fetchPrintRun>>>;
export type PrintRunFile = PrintRunDetail["files"][number];

/**
 * One page of a run's copies, in serial order, with their page codes. A page past the last shows
 * the last. Takes the run fetchPrintRun returned, which has checked the viewer may see it.
 */
export async function fetchPrintRunCopies(run: PrintRunDetail, requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(run.copyCount / COPIES_PER_PAGE));
  const page = Math.min(requestedPage, pageCount);
  const copies = await db.query.surveyQuestionnaire.findMany({
    where: (q, { eq }) => eq(q.printRunId, run.id),
    columns: { id: true, serial: true, status: true },
    with: {
      school: { columns: { schoolName: true } },
      student: { columns: { studentName: true, admissionNumber: true } },
      pages: { columns: { code: true }, orderBy: (p, { asc }) => asc(p.pageNumber) },
    },
    orderBy: (q, { asc }) => asc(q.serialNumber),
    limit: COPIES_PER_PAGE,
    offset: (page - 1) * COPIES_PER_PAGE,
  });
  return { copies, page, pageCount };
}

export type PrintRunCopies = Awaited<ReturnType<typeof fetchPrintRunCopies>>;
export type PrintRunCopy = PrintRunCopies["copies"][number];
