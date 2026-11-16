import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import { FidelityRatingStatus, RecordingProcessingStatus, TranscriptionStatus } from "#/db/enums";
import { fidelityRating, sessionRecording } from "#/db/schema";

// Kept apart from rate.ts, which reads the prompt from disk: the recordings page imports this file,
// and the prompt is traced into the cron route only.

// The prompt carries the checklists of these four sessions and no others.
const RATED_SESSIONS: Record<string, string> = {
  s1: "1 of 4 (Growth Mindset)",
  s2: "2 of 4 (Growth Mindset, part 2)",
  s3: "3 of 4 (Gratitude)",
  s4: "4 of 4 (Value Affirmations)",
};

/** The session line the judge reads, or null for a session the prompt has no checklist for. */
export function ratedSessionLine(sessionName: string | null | undefined) {
  return (sessionName && RATED_SESSIONS[sessionName]) ?? null;
}

/**
 * Brings a recording's rating in line with the session it was just moved to. A rating in flight is
 * failed, so its claim's late write is dropped; the old session's feedback is cleared; and the
 * latest transcript is queued for rating when the new session has a checklist. Runs in the
 * transaction that changed the session, after that update has locked the recording.
 */
export async function rerateAfterSessionChange(tx: Transaction, recordingId: string) {
  const recording = await tx.query.sessionRecording.findFirst({
    where: (r, { eq }) => eq(r.id, recordingId),
    columns: { id: true },
    with: {
      session: { columns: {}, with: { session: { columns: { sessionName: true } } } },
      transcriptions: {
        columns: { id: true, status: true },
        orderBy: (t, { desc }) => desc(t.createdAt),
        limit: 1,
      },
    },
  });
  const latestTranscript = recording?.transcriptions[0];
  // Not transcribed yet: finishTranscription reads the new session when it completes.
  if (!recording || latestTranscript?.status !== TranscriptionStatus.COMPLETED) return;

  await tx
    .update(fidelityRating)
    .set({
      status: FidelityRatingStatus.FAILED,
      errorMessage: "The recording was moved to another session",
    })
    .where(
      and(
        eq(fidelityRating.recordingId, recordingId),
        inArray(fidelityRating.status, [
          FidelityRatingStatus.QUEUED,
          FidelityRatingStatus.PROCESSING,
        ]),
      ),
    );
  const ratingQueued = ratedSessionLine(recording.session.session?.sessionName) !== null;
  if (ratingQueued) {
    await tx.insert(fidelityRating).values({ recordingId, transcriptionId: latestTranscript.id });
  }
  await tx
    .update(sessionRecording)
    .set({
      status: ratingQueued
        ? RecordingProcessingStatus.PROCESSING
        : RecordingProcessingStatus.COMPLETED,
      processedAt: ratingQueued ? null : new Date(),
      errorMessage: null,
      fidelityFeedback: null,
      overallScore: null,
      promptVersion: null,
    })
    .where(eq(sessionRecording.id, recordingId));
}
