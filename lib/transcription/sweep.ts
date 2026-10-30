import "server-only";

import { and, eq, lt } from "drizzle-orm";

import { db } from "#/db/client";
import { TranscriptionStatus } from "#/db/enums";
import { sessionRecordingTranscript } from "#/db/schema";

// Longer than the recordings page's maxDuration (800 s), so only a run the platform has killed is
// past it.
export const STALE_TRANSCRIPTION_MINUTES = 20;

/**
 * Marks transcriptions stuck past the cutoff as FAILED and returns their recording IDs: PROCESSING
 * since startedAt (the run was killed), or QUEUED since updatedAt (the after() that would have
 * claimed it never ran).
 */
export async function failStaleTranscriptions(): Promise<string[]> {
  const cutoff = new Date(Date.now() - STALE_TRANSCRIPTION_MINUTES * 60_000);
  const [stuckProcessing, neverStarted] = await Promise.all([
    db
      .update(sessionRecordingTranscript)
      .set({
        status: TranscriptionStatus.FAILED,
        errorMessage: `Timed out: still processing after ${STALE_TRANSCRIPTION_MINUTES} minutes`,
      })
      .where(
        and(
          eq(sessionRecordingTranscript.status, TranscriptionStatus.PROCESSING),
          lt(sessionRecordingTranscript.startedAt, cutoff),
        ),
      )
      .returning({ recordingId: sessionRecordingTranscript.recordingId }),
    db
      .update(sessionRecordingTranscript)
      .set({
        status: TranscriptionStatus.FAILED,
        errorMessage: `Never started: still queued after ${STALE_TRANSCRIPTION_MINUTES} minutes`,
      })
      .where(
        and(
          eq(sessionRecordingTranscript.status, TranscriptionStatus.QUEUED),
          lt(sessionRecordingTranscript.updatedAt, cutoff),
        ),
      )
      .returning({ recordingId: sessionRecordingTranscript.recordingId }),
  ]);
  return [...stuckProcessing, ...neverStarted].map((row) => row.recordingId);
}
