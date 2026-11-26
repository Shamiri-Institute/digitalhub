// When an unfinished upload's job counts as stuck. From the moment it is queued, every status
// change and every sign of progress moves `survey_uploads.stuck_after` on by the step's allowance;
// a finished or failed upload has none. An UPLOADED upload has none either: it waits for a pipeline
// to be set and the notification cron to queue it, which is nothing a re-run can fix.

import { type AnyColumn, sql } from "drizzle-orm";

import { SurveyUploadStatus } from "#/db/enums";

export const StuckAfter = {
  /** QUEUED and not yet taken, `afterSeconds` from the next try: the cron runs every minute. */
  waitingForCron: (afterSeconds = 0) =>
    sql`now() + make_interval(secs => ${afterSeconds}) + interval '10 minutes'`,
  /** QUEUED and taken by the pipeline, which should start the job within this. */
  waitingForPipeline: sql`now() + interval '2 hours'`,
  /** PROCESSING: a heartbeat or a page post comes at least every 5 minutes. */
  working: sql`now() + interval '15 minutes'`,
};

/**
 * Takes the columns as the query names them, so it works under a relational query's alias too.
 * Only a queued or processing job can be stuck, whatever deadline a finished one was left with.
 */
export function isStuck(status: AnyColumn, stuckAfter: AnyColumn) {
  return sql<boolean>`coalesce(
    ${status} in (${SurveyUploadStatus.QUEUED}, ${SurveyUploadStatus.PROCESSING})
      and ${stuckAfter} < now(),
    false
  )`;
}
