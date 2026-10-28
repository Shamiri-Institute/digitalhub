import { db, isUniqueViolation } from "#/db/client";
import { type PrintRunViewer, printRunScope } from "#/lib/auth/survey-access";
import {
  type IssuedPrintRun,
  issuePrintRun,
  PrintRunError,
  type PrintRunRequest,
} from "#/lib/survey/print-run";
import { serialRangeOf } from "#/lib/survey/print-run-queries";

export type PrintRunSubmission = {
  printRunId: string;
  versionId: string;
  /** Admins only: a hub coordinator prints for their own hub. */
  hubId?: string;
  request: PrintRunRequest;
};

/**
 * Issues the run a print form submits, or returns it if this viewer already issued it. A form
 * resubmitted after its first reply was lost finds its run before any check, so a student or
 * school archived in between can't refuse the retry, and it never makes a second run.
 */
export async function submitPrintRun(
  viewer: PrintRunViewer,
  submission: PrintRunSubmission,
): Promise<IssuedPrintRun> {
  const earlier = await issuedRunOf(submission.printRunId, viewer.userId);
  if (earlier) {
    return earlier;
  }
  const scope = await printRunScope(viewer, submission.hubId);
  try {
    return await db.transaction((tx) => issuePrintRun(tx, scope, submission));
  } catch (error) {
    if (!isUniqueViolation(error, "survey_print_runs_pkey")) {
      throw error;
    }
    // A concurrent submit of the same form committed first.
    const committed = await issuedRunOf(submission.printRunId, viewer.userId);
    if (!committed) {
      throw new PrintRunError("Please reopen the form and try again");
    }
    return committed;
  }
}

async function issuedRunOf(printRunId: string, userId: string): Promise<IssuedPrintRun | null> {
  const run = await db.query.surveyPrintRun.findFirst({
    where: (r, { and, eq }) => and(eq(r.id, printRunId), eq(r.requestedBy, userId)),
    columns: { id: true, copyCount: true },
  });
  if (!run) {
    return null;
  }
  const { firstSerial, lastSerial } = await serialRangeOf(run.id);
  if (!firstSerial || !lastSerial) {
    throw new Error(`Print run ${run.id} has no copies`);
  }
  return { printRunId: run.id, copyCount: run.copyCount, firstSerial, lastSerial };
}
