import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { TranscriptionStatus } from "#/db/enums";
import { sessionRecordingTranscript } from "#/db/schema";
import { env } from "#/env";
import { getPresignedUrl } from "#/lib/s3/s3.service";
import { DEFAULT_MODEL, redactUrls, transcribeAudio } from "#/lib/transcription/gemini";

// Not a "use server" file on purpose: its exports would be public endpoints taking any recording ID.
// The upload action calls transcribeRecording through after(); a cron or worker can call it as is.

const ERROR_MESSAGE_MAX = 500;

/**
 * Makes sure the recording has a transcript row and moves it to PROCESSING if it is QUEUED or
 * FAILED. Returns the attempt number this run holds, or null when the transcript is COMPLETED or
 * another run is PROCESSING it.
 */
export async function claimTranscription(recordingId: string): Promise<number | null> {
  await db
    .insert(sessionRecordingTranscript)
    .values({ recordingId })
    .onConflictDoNothing({ target: sessionRecordingTranscript.recordingId });
  const [claimed] = await db
    .update(sessionRecordingTranscript)
    .set({
      status: TranscriptionStatus.PROCESSING,
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
      attempts: sql`${sessionRecordingTranscript.attempts} + 1`,
    })
    .where(
      and(
        eq(sessionRecordingTranscript.recordingId, recordingId),
        inArray(sessionRecordingTranscript.status, [
          TranscriptionStatus.QUEUED,
          TranscriptionStatus.FAILED,
        ]),
      ),
    )
    .returning({ attempt: sessionRecordingTranscript.attempts });
  return claimed?.attempt ?? null;
}

// The attempt number fences the writes below: a run whose row has since been claimed again (after
// the sweep failed it) must not overwrite the newer run. A run the sweep failed but nobody retried
// may still record its result.
function heldBy(recordingId: string, attempt: number) {
  return and(
    eq(sessionRecordingTranscript.recordingId, recordingId),
    eq(sessionRecordingTranscript.attempts, attempt),
    inArray(sessionRecordingTranscript.status, [
      TranscriptionStatus.PROCESSING,
      TranscriptionStatus.FAILED,
    ]),
  );
}

async function failTranscription(recordingId: string, attempt: number, reason: string) {
  const errorMessage = redactUrls(reason).slice(0, ERROR_MESSAGE_MAX);
  const failed = await db
    .update(sessionRecordingTranscript)
    .set({ status: TranscriptionStatus.FAILED, errorMessage })
    .where(heldBy(recordingId, attempt))
    .returning({ id: sessionRecordingTranscript.id });
  const note = failed.length ? "" : " (not recorded: the row was claimed again)";
  console.log(`[transcribe ${recordingId}] FAILED attempt ${attempt}: ${errorMessage}${note}`);
}

/** Transcribes a recording into its session_recording_transcripts row. Never throws. */
export async function transcribeRecording(recordingId: string): Promise<void> {
  const label = `[transcribe ${recordingId}]`;
  try {
    const recording = await db.query.sessionRecording.findFirst({
      where: (r, { eq }) => eq(r.id, recordingId),
      columns: { s3Key: true, archivedAt: true },
    });
    if (!recording) {
      console.log(`${label} skipped: recording not found`);
      return;
    }

    const attempt = await claimTranscription(recordingId);
    if (attempt === null) {
      console.log(`${label} skipped: already COMPLETED or PROCESSING`);
      return;
    }
    console.log(`${label} attempt ${attempt} started for ${recording.s3Key}`);

    try {
      if (recording.archivedAt) throw new Error("Recording is archived");
      if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

      const url = await getPresignedUrl(recording.s3Key, "recordings", 3600);
      const result = await transcribeAudio(
        { url },
        {
          apiKey: env.GEMINI_API_KEY,
          model: env.GEMINI_MODEL ?? DEFAULT_MODEL,
          recordingId,
        },
      );

      const completed = await db
        .update(sessionRecordingTranscript)
        .set({
          status: TranscriptionStatus.COMPLETED,
          completedAt: new Date(),
          errorMessage: null,
          model: result.model,
          variant: result.variant,
          chunkSeconds: result.chunkSeconds,
          segments: result.segments,
          warnings: result.warnings,
        })
        .where(heldBy(recordingId, attempt))
        .returning({ id: sessionRecordingTranscript.id });
      console.log(
        completed.length
          ? `${label} COMPLETED attempt ${attempt}: ${result.segments.length} segments, ` +
              `${result.chunks} chunk(s), ${result.durationSeconds.toFixed(0)}s of audio`
          : `${label} result of attempt ${attempt} discarded: the row was claimed again`,
      );
    } catch (error) {
      await failTranscription(
        recordingId,
        attempt,
        error instanceof Error ? error.message : String(error),
      );
    }
  } catch (error) {
    // A database error outside the job; the sweep fails a row left in PROCESSING.
    console.error(
      `${label} error: ${redactUrls(error instanceof Error ? error.message : String(error))}`,
    );
  }
}
