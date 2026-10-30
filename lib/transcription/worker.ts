import "server-only";

import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { type RecordingProcessingStatus, TranscriptionStatus } from "#/db/enums";
import { sessionRecording, transcription } from "#/db/schema";
import { getPresignedUrl } from "#/lib/s3/s3.service";
import {
  DamagedAudioError,
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
    const claimable = tx
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
    const claimed = await tx
      .update(transcription)
      .set({
        status: TranscriptionStatus.PROCESSING,
        startedAt: new Date(),
        attempts: sql`${transcription.attempts} + 1`,
      })
      .where(inArray(transcription.id, claimable))
      .returning({
        id: transcription.id,
        recordingId: transcription.recordingId,
        attempts: transcription.attempts,
      });
    if (claimed.length > 0) {
      await tx
        .update(sessionRecording)
        .set({ status: recordingStatusFor.PROCESSING, errorMessage: null })
        .where(
          inArray(
            sessionRecording.id,
            claimed.map((run) => run.recordingId),
          ),
        );
    }
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

async function runTranscription(run: ClaimedTranscription) {
  const label = `[transcription ${run.id} attempt ${run.attempts}]`;
  if (run.attempts > MAX_ATTEMPTS) {
    await finishTranscription(run, {
      status: TranscriptionStatus.FAILED,
      errorMessage: `Transcription stopped responding ${MAX_ATTEMPTS} times`,
    });
    return;
  }
  try {
    const recording = await db.query.sessionRecording.findFirst({
      where: (r, { eq }) => eq(r.id, run.recordingId),
      columns: { s3Key: true },
    });
    if (!recording) throw new Error(`Recording ${run.recordingId} not found`);
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
  } catch (error) {
    const errorMessage = (error instanceof Error ? error.message : String(error)).slice(0, 500);
    const permanent = error instanceof DamagedAudioError || run.attempts >= MAX_ATTEMPTS;
    const status = permanent ? TranscriptionStatus.FAILED : TranscriptionStatus.QUEUED;
    await finishTranscription(run, { status, errorMessage });
    console.error(`${label} ${status}: ${errorMessage}`);
  }
}

export async function runQueuedTranscriptions() {
  const runs = await claimTranscriptions();
  await Promise.all(runs.map(runTranscription));
  return runs.length;
}
