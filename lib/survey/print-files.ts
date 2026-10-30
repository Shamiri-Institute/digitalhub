// The print job: issues each print file's copies, renders the file and puts it in S3. The files
// table is the queue. Workers claim a file with a lease, so any number of them can drain it at once
// and one that dies mid-file is replaced when its lease runs out. A drain starts after a run is
// made or retried, when a run's page is viewed while it is unfinished, and every minute from the
// cron route, so a file is picked up wherever the app runs, without a queue service.

import { readFile } from "node:fs/promises";
import path from "node:path";

import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { after } from "next/server";

import { db, isIntegrityViolation, type Transaction } from "#/db/client";
import { SurveyPrintStatus } from "#/db/enums";
import { surveyPrintFile } from "#/db/schema";
import type { PrintRunViewer } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import { getPresignedUrl, putObject } from "#/lib/s3/s3.service";
import type { Layout } from "#/lib/survey/layout";
import { PRINT_FONT_FILES, type PrintFonts } from "#/lib/survey/print-fonts";
import { type PrintedCopy, renderCopiesPdf } from "#/lib/survey/print-pdf";
import { issuePrintFile } from "#/lib/survey/print-run";
import { fetchPrintRun } from "#/lib/survey/print-run-queries";
import { serialRangeOf } from "#/lib/survey/serial";

/**
 * How long a claimed file is a worker's. Longer than the 300 s a function that drains may run
 * (`maxDuration`), so a worker still running never loses its file to another.
 */
const LEASE_SECONDS = 330;
const DRAIN_BUDGET_MS = 240_000;
/** No file is claimed with less of the budget left than a large file may take to render. */
const FILE_RESERVE_MS = 150_000;
const MAX_ATTEMPTS = 3;
/** Files rendering at once across all workers, each holding up to about 850 MB while it renders. */
const MAX_LIVE_LEASES = 6;

export type DrainResult = { ready: number; failed: number; retrying: number };

type Lease = { fileId: string; leaseToken: string; attempts: number };

let draining: Promise<DrainResult> | null = null;

/**
 * Renders unfinished files until none can be claimed or the budget runs out, then returns how many
 * it finished. A drain already running in this instance is joined, not doubled: instances serve
 * requests side by side, and two large files at once would not fit in memory. `printRunId`
 * restricts it to one run's files, for tests.
 */
export function drainPrintQueue({ printRunId }: { printRunId?: string } = {}) {
  draining ??= drain(printRunId, Date.now() + DRAIN_BUDGET_MS).finally(() => {
    draining = null;
  });
  return draining;
}

/** Drains the queue after the response is sent. Safe to call any number of times. */
export function kickPrintQueue() {
  after(async () => {
    try {
      await drainPrintQueue();
    } catch (error) {
      console.error("Print queue drain failed", error);
    }
  });
}

async function drain(printRunId: string | undefined, deadline: number): Promise<DrainResult> {
  const result: DrainResult = { ready: 0, failed: 0, retrying: 0 };
  await failAbandonedFiles();
  /* oxlint-disable eslint/no-await-in-loop -- a worker renders one file at a time */
  while (deadline - Date.now() > FILE_RESERVE_MS) {
    const lease = await claim(printRunId);
    if (!lease) {
      break;
    }
    const outcome = await produce(lease);
    if (outcome !== "lost-lease") {
      result[outcome] += 1;
    }
  }
  /* oxlint-enable eslint/no-await-in-loop */
  return result;
}

/** Files whose last attempt's worker died: their lease ran out with no attempts left. */
async function failAbandonedFiles() {
  await db
    .update(surveyPrintFile)
    .set({
      status: SurveyPrintStatus.FAILED,
      leaseToken: null,
      leasedUntil: null,
      error: "Rendering stopped before the file was finished",
    })
    .where(
      and(
        eq(surveyPrintFile.status, SurveyPrintStatus.RENDERING),
        lt(surveyPrintFile.leasedUntil, sql`now()`),
        sql`${surveyPrintFile.attempts} >= ${MAX_ATTEMPTS}`,
      ),
    );
}

/** The next file to render, or one whose worker's lease ran out, as this worker's for a while. */
async function claim(printRunId: string | undefined): Promise<Lease | null> {
  const claimable = db
    .select({ id: surveyPrintFile.id })
    .from(surveyPrintFile)
    .where(
      and(
        or(
          eq(surveyPrintFile.status, SurveyPrintStatus.QUEUED),
          and(
            eq(surveyPrintFile.status, SurveyPrintStatus.RENDERING),
            lt(surveyPrintFile.leasedUntil, sql`now()`),
          ),
        ),
        lt(surveyPrintFile.attempts, MAX_ATTEMPTS),
        printRunId === undefined ? undefined : eq(surveyPrintFile.printRunId, printRunId),
      ),
    )
    // A file being retried waits behind files not yet tried, so one that keeps failing can't hold
    // up the rest of its run.
    .orderBy(
      asc(surveyPrintFile.attempts),
      asc(surveyPrintFile.createdAt),
      asc(surveyPrintFile.firstSerialNumber),
    )
    .limit(1)
    .for("update", { skipLocked: true });
  const liveLeases = db
    .select({ count: sql`count(*)` })
    .from(surveyPrintFile)
    .where(
      and(
        eq(surveyPrintFile.status, SurveyPrintStatus.RENDERING),
        sql`${surveyPrintFile.leasedUntil} > now()`,
      ),
    );
  const leaseToken = objectId("printlease");
  const [claimed] = await db
    .update(surveyPrintFile)
    .set({
      status: SurveyPrintStatus.RENDERING,
      leaseToken,
      leasedUntil: sql`now() + make_interval(secs => ${LEASE_SECONDS})`,
      attempts: sql`${surveyPrintFile.attempts} + 1`,
    })
    .where(and(inArray(surveyPrintFile.id, claimable), sql`(${liveLeases}) < ${MAX_LIVE_LEASES}`))
    .returning({ fileId: surveyPrintFile.id, attempts: surveyPrintFile.attempts });
  return claimed ? { ...claimed, leaseToken } : null;
}

/** Issues, renders and uploads one claimed file, and records how it went. */
async function produce(lease: Lease): Promise<"ready" | "failed" | "retrying" | "lost-lease"> {
  try {
    await db.transaction((tx) => issuePrintFile(tx, lease.fileId));
    const file = await loadPrintFile(lease.fileId);
    const bytes = await renderCopiesPdf(file.layout, file.copies, await printFonts());
    await putObject(printFileKey(file), "survey-print-files", bytes, "application/pdf");
    return await finish(lease, "ready", {
      status: SurveyPrintStatus.READY,
      byteSize: bytes.length,
      renderedAt: new Date(),
      error: null,
    });
  } catch (error) {
    console.error(`Print file ${lease.fileId} failed`, error);
    // A copy the database refuses is refused again on a retry, so it fails the file at once.
    const failed = isIntegrityViolation(error) || lease.attempts >= MAX_ATTEMPTS;
    return finish(lease, failed ? "failed" : "retrying", {
      status: failed ? SurveyPrintStatus.FAILED : SurveyPrintStatus.QUEUED,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Records a file's outcome, if this worker still holds its lease; another worker's wins otherwise. */
async function finish<O extends "ready" | "failed" | "retrying">(
  lease: Lease,
  outcome: O,
  values: Partial<typeof surveyPrintFile.$inferInsert>,
): Promise<O | "lost-lease"> {
  const [finished] = await db
    .update(surveyPrintFile)
    .set({ ...values, leaseToken: null, leasedUntil: null })
    .where(
      and(eq(surveyPrintFile.id, lease.fileId), eq(surveyPrintFile.leaseToken, lease.leaseToken)),
    )
    .returning({ id: surveyPrintFile.id });
  return finished ? outcome : "lost-lease";
}

/** A file's copies in serial order, each with its pages and header values, and the layout. */
async function loadPrintFile(fileId: string) {
  const file = await db.query.surveyPrintFile.findFirst({
    where: (f, { eq }) => eq(f.id, fileId),
    columns: { id: true, printRunId: true, firstSerialNumber: true, copyCount: true },
    with: {
      school: { columns: { schoolName: true } },
      printRun: {
        columns: {},
        with: { version: { columns: { layout: true } } },
      },
    },
  });
  const layout = file?.printRun.version.layout;
  if (!file || !layout) {
    throw new Error(`Print file ${fileId} has no layout to print`);
  }
  const lastSerialNumber = file.firstSerialNumber + file.copyCount - 1;
  const questionnaires = await db.query.surveyQuestionnaire.findMany({
    where: (q, { and, between, eq }) =>
      and(
        eq(q.printRunId, file.printRunId),
        between(q.serialNumber, file.firstSerialNumber, lastSerialNumber),
      ),
    columns: { serial: true },
    with: {
      student: { columns: { studentName: true, admissionNumber: true } },
      pages: { columns: { id: true, code: true }, orderBy: (p, { asc }) => asc(p.pageNumber) },
    },
    orderBy: (q, { asc }) => asc(q.serialNumber),
  });
  if (questionnaires.length !== file.copyCount) {
    throw new Error(`Print file ${fileId} has ${questionnaires.length} of its copies`);
  }
  const copies = questionnaires.map((questionnaire): PrintedCopy<Layout> => ({
    // Every header value; the layout prints those its prefill shows.
    values: {
      serial: questionnaire.serial,
      school: file.school.schoolName,
      studentName: questionnaire.student?.studentName ?? "",
      studentId: questionnaire.student?.admissionNumber ?? "",
    },
    pages: questionnaire.pages,
  }));
  return { id: file.id, printRunId: file.printRunId, layout, copies };
}

let fonts: Promise<PrintFonts> | null = null;

/** The print fonts from public/fonts/figtree, which next.config.js traces into every function. */
function printFonts() {
  const load = async (file: string) =>
    new Uint8Array(await readFile(path.join(process.cwd(), "public/fonts/figtree", file)));
  fonts ??= Promise.all([
    load(PRINT_FONT_FILES[400]),
    load(PRINT_FONT_FILES[600]),
    load(PRINT_FONT_FILES[700]),
  ]).then(([regular, semibold, bold]) => ({ 400: regular, 600: semibold, 700: bold }));
  return fonts;
}

export function printFileKey(file: { id: string; printRunId: string }) {
  return `print-runs/${file.printRunId}/${file.id}.pdf`;
}

/** Queues a run's failed files again, with fresh attempts. Returns how many it queued. */
export async function retryFailedPrintFiles(tx: Transaction, printRunId: string) {
  const queued = await tx
    .update(surveyPrintFile)
    .set({ status: SurveyPrintStatus.QUEUED, attempts: 0, error: null })
    .where(
      and(
        eq(surveyPrintFile.printRunId, printRunId),
        eq(surveyPrintFile.status, SurveyPrintStatus.FAILED),
      ),
    )
    .returning({ id: surveyPrintFile.id });
  return queued.length;
}

/**
 * A short-lived link to download a ready file the viewer may see, named for the person printing
 * it. Undefined for a file that isn't ready or isn't the viewer's to see.
 */
export async function printFileDownloadUrl(viewer: PrintRunViewer, fileId: string) {
  const file = await db.query.surveyPrintFile.findFirst({
    where: (f, { and, eq }) => and(eq(f.id, fileId), eq(f.status, SurveyPrintStatus.READY)),
    columns: { id: true, printRunId: true, firstSerialNumber: true, copyCount: true },
    with: { school: { columns: { schoolName: true } } },
  });
  const run = file && (await fetchPrintRun(viewer, file.printRunId));
  if (!file || !run) {
    return;
  }
  const { firstSerial, lastSerial } = serialRangeOf(run.version.survey.code, file);
  const downloadName = `${run.version.survey.code} v${run.version.versionNumber} ${file.school.schoolName} ${firstSerial} to ${lastSerial}.pdf`;
  return getPresignedUrl(printFileKey(file), "survey-print-files", 300, { downloadName });
}
