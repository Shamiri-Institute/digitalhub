// Telling the extraction pipeline a scan is ready. The uploads table is the outbox: an upload is
// marked QUEUED before the first send, so a worker that starts at once is never refused, then
// notified until the pipeline answers 2xx, backing off between tries. Runs claim uploads with
// SKIP LOCKED and hold them for a short lease while sending, so overlapping runs never send one
// upload twice at once. The pipeline starts one job per upload and attempt, so a repeat is harmless.

import "server-only";

import { and, asc, eq, gte, inArray, isNull, lt, lte, type SQL, sql } from "drizzle-orm";
import { after } from "next/server";

import { db } from "#/db/client";
import { SurveyAuditActor, SurveyUploadStatus } from "#/db/enums";
import { surveyUpload } from "#/db/schema";
import { recordSurveyEvents, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { StuckAfter } from "#/lib/survey/pipeline-deadlines";
import {
  PipelineDirection,
  pipelineSecret,
  SIGNATURE_HEADER,
  signPipelineRequest,
  TIMESTAMP_HEADER,
} from "#/lib/survey/pipeline-signing";
import { pipelineUploadsUrl } from "#/lib/survey/pipeline-url";

/**
 * Notifications one run sends: due retries first, then new uploads queued into the room left, so a
 * queued upload never waits behind others; the rest of a backlog waits UPLOADED, which has no
 * deadline.
 */
const UPLOADS_PER_RUN = 50;
const SEND_TIMEOUT_MS = 10_000;
/** How long a claimed upload is this run's while it sends, longer than any send can take. */
const SEND_LEASE_SECONDS = 60;
/** After this many refused tries the upload stops retrying and shows as stuck. */
export const MAX_NOTIFY_TRIES = 10;
const FIRST_RETRY_SECONDS = 60;
const LONGEST_RETRY_SECONDS = 60 * 60;

export type NotifyResult = {
  queued: number;
  accepted: number;
  retrying: number;
  gaveUp: number;
};

type ClaimedUpload = Pick<
  typeof surveyUpload.$inferSelect,
  "id" | "attempt" | "contentType" | "byteSize" | "sha256" | "notifyTries"
>;

/**
 * Queues uploads that are in and notifies the pipeline of every queued upload that is due a try.
 * Throws, after recording every try, when an upload has used its last one.
 * Does nothing where no pipeline is set, as on previews. `uploadIds` restricts it to those uploads,
 * for tests.
 */
export async function notifyPipeline({ uploadIds }: { uploadIds?: string[] } = {}): Promise<
  NotifyResult | { skipped: "no pipeline" }
> {
  const pipeline = pipelineSettings();
  if (!pipeline) {
    return { skipped: "no pipeline" };
  }
  const { queued, claimed, abandoned } = await queueAndClaim(uploadIds);
  // Each try is recorded as soon as its own send returns, so one slow pipeline answer can't leave
  // the others unrecorded, and sent again, if the run is cut short.
  const outcomes = await Promise.all(
    claimed.map(async (upload) => recordTry(upload, await send(pipeline, upload))),
  );
  const result: NotifyResult = { queued, accepted: 0, retrying: 0, gaveUp: abandoned };
  for (const outcome of outcomes) {
    if (outcome) {
      result[outcome] += 1;
    }
  }
  if (result.gaveUp > 0) {
    // Recorded already; thrown so the cron's monitor alerts, as a pipeline refusing every
    // notification shows nowhere else.
    throw new Error(
      `The pipeline refused ${result.gaveUp} upload(s) ${MAX_NOTIFY_TRIES} times; they are stuck`,
    );
  }
  return result;
}

/**
 * Notifies after the response is sent, where no cron runs (previews, local), so an upload reaches a
 * local pipeline without one. Safe to call any number of times: runs claim uploads with a lease.
 */
export function kickPipelineNotify() {
  if (process.env.VERCEL_ENV === "production") {
    return;
  }
  after(async () => {
    try {
      await notifyPipeline();
    } catch (error) {
      console.error("Notifying the pipeline failed", error);
    }
  });
}

/**
 * The pipeline to notify, or null where none is set. Read at each call, as the signing secret
 * is, so a test can set it. A URL without a usable secret is a broken deployment, not a preview, so
 * it throws, and the cron's monitor reports it rather than every scan waiting unseen.
 */
function pipelineSettings() {
  const url = process.env.SURVEY_PIPELINE_URL;
  if (!url) {
    return null;
  }
  const secret = pipelineSecret();
  if (!secret) {
    throw new Error("SURVEY_PIPELINE_URL is set but SURVEY_PIPELINE_SECRET is missing or short");
  }
  const uploadsUrl = pipelineUploadsUrl(url);
  if (!uploadsUrl) {
    throw new Error("SURVEY_PIPELINE_URL must be http(s), with no query string or fragment");
  }
  return { url: uploadsUrl, secret };
}

async function queueAndClaim(uploadIds: string[] | undefined) {
  const onlyThese = uploadIds ? inArray(surveyUpload.id, uploadIds) : undefined;
  const sendFields = {
    id: surveyUpload.id,
    attempt: surveyUpload.attempt,
    contentType: surveyUpload.contentType,
    byteSize: surveyUpload.byteSize,
    sha256: surveyUpload.sha256,
    notifyTries: surveyUpload.notifyTries,
  };
  const dueQueued = and(
    eq(surveyUpload.status, SurveyUploadStatus.QUEUED),
    isNull(surveyUpload.notifiedAt),
    lte(surveyUpload.notifyNextAt, sql`now()`),
    onlyThese,
  );
  return db.transaction(async (tx) => {
    // A run that claimed an upload's last try and died never recorded it: given up all the same.
    const abandoned = await tx
      .update(surveyUpload)
      .set({
        notifyNextAt: null,
        notifyError: "The last notification went unanswered",
        stuckAfter: sql`now()`,
      })
      .where(and(dueQueued, gte(surveyUpload.notifyTries, MAX_NOTIFY_TRIES)))
      .returning({ id: surveyUpload.id });

    const dueRetries = tx
      .select({ id: surveyUpload.id })
      .from(surveyUpload)
      .where(and(dueQueued, lt(surveyUpload.notifyTries, MAX_NOTIFY_TRIES)))
      .orderBy(asc(surveyUpload.notifyNextAt))
      .limit(UPLOADS_PER_RUN)
      .for("update", { skipLocked: true });
    const retried: ClaimedUpload[] = await tx
      .update(surveyUpload)
      .set({
        notifyTries: sql`${surveyUpload.notifyTries} + 1`,
        notifyNextAt: sql`now() + make_interval(secs => ${SEND_LEASE_SECONDS})`,
        stuckAfter: StuckAfter.waitingForCron(),
      })
      .where(inArray(surveyUpload.id, dueRetries))
      .returning(sendFields);

    // Only as many new uploads as this run can send, so none waits queued behind retries.
    const room = UPLOADS_PER_RUN - retried.length;
    if (room === 0) {
      return { queued: 0, claimed: retried, abandoned: abandoned.length };
    }
    const toQueue = tx
      .select({ id: surveyUpload.id })
      .from(surveyUpload)
      .where(and(eq(surveyUpload.status, SurveyUploadStatus.UPLOADED), onlyThese))
      .orderBy(asc(surveyUpload.uploadedAt))
      .limit(room)
      .for("update", { skipLocked: true });
    const queued: ClaimedUpload[] = await tx
      .update(surveyUpload)
      .set({
        status: SurveyUploadStatus.QUEUED,
        notifyTries: 1,
        notifyNextAt: sql`now() + make_interval(secs => ${SEND_LEASE_SECONDS})`,
        stuckAfter: StuckAfter.waitingForCron(),
        notifiedAt: null,
        notifyError: null,
      })
      .where(inArray(surveyUpload.id, toQueue))
      .returning(sendFields);
    await recordSurveyEvents(
      tx,
      queued.map(({ id, attempt }) => ({
        actor: { kind: SurveyAuditActor.SYSTEM },
        entityType: SurveyAuditEntity.SCAN_UPLOAD,
        entityId: id,
        action: SurveyAuditAction.SCAN_QUEUED,
        before: { status: SurveyUploadStatus.UPLOADED },
        after: { status: SurveyUploadStatus.QUEUED, attempt },
      })),
    );
    return { queued: queued.length, claimed: [...retried, ...queued], abandoned: abandoned.length };
  });
}

/** Sends one notification; answers why the pipeline didn't take it, or undefined if it did. */
async function send(
  pipeline: { url: URL; secret: string },
  upload: ClaimedUpload,
): Promise<string | undefined> {
  const body = JSON.stringify({
    uploadId: upload.id,
    attempt: upload.attempt,
    contentType: upload.contentType,
    byteSize: upload.byteSize,
    sha256: upload.sha256,
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPipelineRequest(pipeline.secret, {
    direction: PipelineDirection.SDH_TO_PIPELINE,
    timestamp,
    method: "POST",
    path: pipeline.url.pathname,
    body,
  });
  let response: Response;
  try {
    response = await fetch(pipeline.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [TIMESTAMP_HEADER]: String(timestamp),
        [SIGNATURE_HEADER]: signature,
      },
      body,
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      redirect: "error",
    });
  } catch (error) {
    return `The pipeline couldn't be reached: ${error instanceof Error ? error.message : String(error)}`;
  }
  // The answer has no body worth reading; closing it can't undo the status already received.
  response.body?.cancel().catch(() => {});
  return response.ok ? undefined : `The pipeline answered ${response.status}`;
}

/**
 * Records a try against the attempt it was sent for, so a re-run started meanwhile is untouched;
 * undefined when it no longer matches. Once the pipeline has the job it may already have moved the
 * upload on to PROCESSING, whose deadline is the pipeline's to move, so the deadline here changes
 * only while still QUEUED. A refusal is recorded only while QUEUED: a send that timed out may
 * still have reached a pipeline that has since started.
 */
async function recordTry(
  upload: ClaimedUpload,
  refusal: string | undefined,
): Promise<"accepted" | "retrying" | "gaveUp" | undefined> {
  const sameAttempt = and(
    eq(surveyUpload.id, upload.id),
    eq(surveyUpload.attempt, upload.attempt),
    isNull(surveyUpload.notifiedAt),
  );
  const whileQueued = (deadline: SQL) =>
    sql`case when ${surveyUpload.status} = ${SurveyUploadStatus.QUEUED} then ${deadline} else ${surveyUpload.stuckAfter} end`;
  if (refusal === undefined) {
    const [accepted] = await db
      .update(surveyUpload)
      .set({
        notifiedAt: sql`now()`,
        notifyNextAt: null,
        notifyError: null,
        stuckAfter: whileQueued(StuckAfter.waitingForPipeline),
      })
      .where(sameAttempt)
      .returning({ id: surveyUpload.id });
    return accepted ? "accepted" : undefined;
  }
  const gaveUp = upload.notifyTries >= MAX_NOTIFY_TRIES;
  const waitSeconds = Math.min(
    FIRST_RETRY_SECONDS * 2 ** (upload.notifyTries - 1),
    LONGEST_RETRY_SECONDS,
  );
  const [refused] = await db
    .update(surveyUpload)
    .set({
      notifyNextAt: gaveUp ? null : sql`now() + make_interval(secs => ${waitSeconds})`,
      notifyError: refusal,
      // Given up, it is stuck at once; otherwise it is stuck if the retry doesn't happen.
      stuckAfter: gaveUp ? sql`now()` : StuckAfter.waitingForCron(waitSeconds),
    })
    .where(and(sameAttempt, eq(surveyUpload.status, SurveyUploadStatus.QUEUED)))
    .returning({ id: surveyUpload.id });
  if (!refused) {
    return undefined;
  }
  return gaveUp ? "gaveUp" : "retrying";
}
