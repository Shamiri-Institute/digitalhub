import { db, isUniqueViolation } from "#/db/client";
import { type PrintRunViewer, printRunScope } from "#/lib/auth/survey-access";
import {
  type RecordedPrintRun,
  recordPrintRun,
  PrintRunError,
  printRunRequestDigest,
} from "#/lib/survey/print-run";
import type { PrintRunRequest } from "#/lib/survey/print-run-request";
import { serialRangeOf } from "#/lib/survey/serial";

export type PrintRunSubmission = {
  printRunId: string;
  versionId: string;
  /** Admins only: a hub coordinator prints for their own hub. */
  hubId?: string;
  request: PrintRunRequest;
};

/**
 * Records the run a print form submits, or returns it if this viewer already recorded it for the
 * same request. A form resubmitted after its first reply was lost finds its run before any check, so a
 * student or school archived in between can't refuse the retry, and it never makes a second run.
 */
export async function submitPrintRun(
  viewer: PrintRunViewer,
  submission: PrintRunSubmission,
): Promise<RecordedPrintRun> {
  const earlier = await recordedRunOf(submission, viewer.userId);
  if (earlier) {
    return earlier;
  }
  const scope = await printRunScope(viewer, submission.hubId);
  try {
    return await db.transaction((tx) => recordPrintRun(tx, scope, submission));
  } catch (error) {
    if (!isUniqueViolation(error, "survey_print_runs_pkey")) {
      throw error;
    }
    // A concurrent submit of the same form committed first.
    const committed = await recordedRunOf(submission, viewer.userId);
    if (!committed) {
      throw new PrintRunError("Please reopen the form and try again");
    }
    return committed;
  }
}

async function recordedRunOf(
  submission: PrintRunSubmission,
  userId: string,
): Promise<RecordedPrintRun | null> {
  const run = await db.query.surveyPrintRun.findFirst({
    where: (r, { and, eq }) => and(eq(r.id, submission.printRunId), eq(r.requestedBy, userId)),
    columns: {
      id: true,
      versionId: true,
      hubId: true,
      copyCount: true,
      firstSerialNumber: true,
      requestDigest: true,
    },
    with: { version: { columns: {}, with: { survey: { columns: { code: true } } } } },
  });
  if (!run) {
    return null;
  }
  if (
    run.versionId !== submission.versionId ||
    (submission.hubId !== undefined && run.hubId !== submission.hubId) ||
    run.requestDigest !== printRunRequestDigest(submission.request)
  ) {
    throw new PrintRunError(
      "This form already created a different print run. Close it and start again.",
    );
  }
  return {
    printRunId: run.id,
    copyCount: run.copyCount,
    ...serialRangeOf(run.version.survey.code, run),
  };
}
