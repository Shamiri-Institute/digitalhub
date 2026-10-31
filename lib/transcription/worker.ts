import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { type RecordingProcessingStatus, TranscriptionStatus } from "#/db/enums";
import { sessionRecording, transcription } from "#/db/schema";
import { getPresignedUrl } from "#/lib/s3/s3.service";
import {
  UnusableAudioError,
  PROMPT_SHA256,
  PROMPT_VERSION,
  TRANSCRIPTION_MODEL,
  transcribeAudio,
} from "#/lib/transcription/transcribe";

// Not a "use server" file: its exports would be public endpoints. Only the cron route calls them.

const RUNS_PER_TICK = 2;
const MAX_ATTEMPTS = 3;
// Far longer than any live run (maxDuration is 800 s): the attempt fence, not the lease, keeps a
// stale run from overwriting a newer one.
const LEASE_MINUTES = 25;
const RUN_DEADLINE_MS = 700_000;

// The recording's own status mirrors its transcription until a feedback stage extends it.
const recordingStatusFor = {
  QUEUED: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const satisfies Record<TranscriptionStatus, RecordingProcessingStatus>;

export type ClaimedTranscription = Awaited<ReturnType<typeof claimTranscriptions>>[number];

/** Claims queued runs, and runs whose lease expired because their function died. */
export async function claimTranscriptions(limit = RUNS_PER_TICK) {
  const staleBefore = new Date(Date.now() - LEASE_MINUTES * 60_000);
  return db.transaction(async (tx) => {
    // Locked first, then updated by id: inside `IN (subquery)` Postgres may run the subquery more
    // than once and claim past the limit.
    const claimable = await tx
      .select({ id: transcription.id })
      .from(transcription)
      .where(
        or(
          eq(transcription.status, TranscriptionStatus.QUEUED),
          and(
            eq(transcription.status, TranscriptionStatus.PROCESSING),
            lt(transcription.startedAt, staleBefore),
          ),
        ),
      )
      .orderBy(asc(transcription.createdAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (claimable.length === 0) return [];
    const claimed = await tx
      .update(transcription)
      .set({
        status: TranscriptionStatus.PROCESSING,
        startedAt: new Date(),
        attempts: sql`${transcription.attempts} + 1`,
      })
      .where(
        inArray(
          transcription.id,
          claimable.map((run) => run.id),
        ),
      )
      .returning({
        id: transcription.id,
        recordingId: transcription.recordingId,
        attempts: transcription.attempts,
      });
    await tx
      .update(sessionRecording)
      .set({ status: recordingStatusFor.PROCESSING, errorMessage: null })
      .where(
        inArray(
          sessionRecording.id,
          claimed.map((run) => run.recordingId),
        ),
      );
    return claimed;
  });
}

/**
 * Moves a claimed run out of PROCESSING, only if no later claim has taken it over. Returns false
 * when the run lost its claim and the write was dropped.
 */
export async function finishTranscription(
  run: ClaimedTranscription,
  result:
    | { status: "QUEUED" | "FAILED"; errorMessage: string }
    | ({ status: "COMPLETED" } & Omit<
        typeof transcription.$inferInsert,
        "id" | "recordingId" | "status"
      >),
) {
  return db.transaction(async (tx) => {
    const [finished] = await tx
      .update(transcription)
      .set(result)
      .where(
        and(
          eq(transcription.id, run.id),
          eq(transcription.status, TranscriptionStatus.PROCESSING),
          eq(transcription.attempts, run.attempts),
        ),
      )
      .returning({ id: transcription.id });
    if (!finished) return false;
    await tx
      .update(sessionRecording)
      .set({
        status: recordingStatusFor[result.status],
        processedAt: result.status === "QUEUED" ? null : new Date(),
        errorMessage: result.status === "COMPLETED" ? null : result.errorMessage,
      })
      .where(eq(sessionRecording.id, run.recordingId));
    return true;
  });
}

// Ids, reasons and counts only: the transcript is speech from sessions with minors. Retried errors
// stay in the logs, so a short Gemini outage alerts no one; the run's last attempt reports it.
function report(
  run: ClaimedTranscription,
  reason: string,
  message: string,
  level: "error" | "warning",
) {
  Sentry.captureMessage(message, {
    level,
    fingerprint: ["transcription", reason],
    tags: { transcription_reason: reason },
    extra: { transcriptionId: run.id, recordingId: run.recordingId, attempt: run.attempts },
  });
}

async function runTranscription(run: ClaimedTranscription) {
  const label = `[transcription ${run.id} attempt ${run.attempts}]`;
  if (run.attempts > MAX_ATTEMPTS) {
    const errorMessage = `Transcription stopped responding ${MAX_ATTEMPTS} times`;
    await finishTranscription(run, { status: TranscriptionStatus.FAILED, errorMessage });
    report(run, "stopped_responding", errorMessage, "error");
    return;
  }
  try {
    const recording = await db.query.sessionRecording.findFirst({
      where: (r, { eq }) => eq(r.id, run.recordingId),
      columns: { s3Key: true, archivedAt: true },
    });
    if (!recording) throw new Error(`Recording ${run.recordingId} not found`);
    // Archiving withdraws the recording, so its audio must not reach Gemini.
    if (recording.archivedAt) {
      await finishTranscription(run, {
        status: TranscriptionStatus.FAILED,
        errorMessage: "The recording was archived before it was transcribed",
      });
      return;
    }
    const url = await getPresignedUrl(recording.s3Key, "recordings", 3600);
    const transcript = await transcribeAudio(url, AbortSignal.timeout(RUN_DEADLINE_MS));
    const recorded = await finishTranscription(run, {
      status: TranscriptionStatus.COMPLETED,
      completedAt: new Date(),
      errorMessage: null,
      model: TRANSCRIPTION_MODEL,
      promptVersion: PROMPT_VERSION,
      promptSha256: PROMPT_SHA256,
      ...transcript,
    });
    console.log(
      `${label} ${recorded ? "completed" : "result dropped: claimed again"}: ` +
        `${transcript.chunkCount} chunks, ${transcript.gaps.length} gaps`,
    );
    if (recorded && transcript.gaps.length > 0) {
      report(run, "gaps", `Transcription completed with ${transcript.gaps.length} gaps`, "warning");
    }
  } catch (error) {
    const errorMessage = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    const unusable = error instanceof UnusableAudioError;
    const status =
      unusable || run.attempts >= MAX_ATTEMPTS
        ? TranscriptionStatus.FAILED
        : TranscriptionStatus.QUEUED;
    await finishTranscription(run, { status, errorMessage });
    console.error(`${label} ${status}: ${errorMessage}`);
    if (unusable) report(run, "unusable_audio", errorMessage, "warning");
    else if (status === TranscriptionStatus.FAILED) report(run, "failed", errorMessage, "error");
  }
}

export async function runQueuedTranscriptions() {
  const runs = await claimTranscriptions();
  await Promise.all(runs.map(runTranscription));
  return runs.length;
}
