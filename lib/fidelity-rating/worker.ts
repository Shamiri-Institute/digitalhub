import "server-only";

import * as Sentry from "@sentry/nextjs";
import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";

import { db, errorMessageWithoutQuery } from "#/db/client";
import { FidelityRatingStatus, RecordingProcessingStatus } from "#/db/enums";
import { fidelityRating, sessionRecording } from "#/db/schema";
import {
  RATING_MODEL,
  RATING_PROMPT_SHA256,
  RATING_PROMPT_VERSION,
  rateTranscript,
} from "#/lib/fidelity-rating/rate";
import { ratedSessionLine } from "#/lib/fidelity-rating/sessions";

// Not a "use server" file: its exports would be public endpoints. Only the cron route calls them.

const RUNS_PER_TICK = 4;
const MAX_ATTEMPTS = 3;
const LEASE_MINUTES = 10;
const RUN_DEADLINE_MS = 300_000;
// The feedback dialog renders the v7 prompt's output with its version 1 layout.
const FEEDBACK_LAYOUT = 1;
const ARCHIVED_MESSAGE = "The recording was archived before feedback was generated";

export type ClaimedRating = Awaited<ReturnType<typeof claimRatings>>[number];

/** Claims queued runs, and runs whose lease expired because their function died. */
export async function claimRatings(limit = RUNS_PER_TICK) {
  const staleBefore = new Date(Date.now() - LEASE_MINUTES * 60_000);
  return db.transaction(async (tx) => {
    // Locked first, then updated by id: inside `IN (subquery)` Postgres may run the subquery more
    // than once and claim past the limit.
    const claimable = await tx
      .select({ id: fidelityRating.id })
      .from(fidelityRating)
      .where(
        or(
          eq(fidelityRating.status, FidelityRatingStatus.QUEUED),
          and(
            eq(fidelityRating.status, FidelityRatingStatus.PROCESSING),
            lt(fidelityRating.startedAt, staleBefore),
          ),
        ),
      )
      .orderBy(asc(fidelityRating.createdAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (claimable.length === 0) return [];
    return tx
      .update(fidelityRating)
      .set({
        status: FidelityRatingStatus.PROCESSING,
        startedAt: new Date(),
        attempts: sql`${fidelityRating.attempts} + 1`,
      })
      .where(
        inArray(
          fidelityRating.id,
          claimable.map((run) => run.id),
        ),
      )
      .returning({
        id: fidelityRating.id,
        recordingId: fidelityRating.recordingId,
        transcriptionId: fidelityRating.transcriptionId,
        attempts: fidelityRating.attempts,
      });
  });
}

/**
 * Moves a claimed run out of PROCESSING, only if no later claim has taken it over, and writes the
 * outcome onto the recording. Returns false when the run lost its claim and the write was dropped.
 */
export async function finishRating(
  run: ClaimedRating,
  outcome:
    | { status: "QUEUED" | "FAILED"; errorMessage: string }
    | { status: "COMPLETED"; feedback: { fidelity_scores: { overall_score: number } } },
) {
  return db.transaction(async (tx) => {
    // Locked first, as a session edit locks it. A recording archived while Gemini was rating it is
    // withdrawn, so its feedback is not kept.
    const [recording] = await tx
      .select({ archivedAt: sessionRecording.archivedAt })
      .from(sessionRecording)
      .where(eq(sessionRecording.id, run.recordingId))
      .for("update");
    const result =
      outcome.status === "COMPLETED" && recording?.archivedAt
        ? { status: "FAILED" as const, errorMessage: ARCHIVED_MESSAGE }
        : outcome;
    const [finished] = await tx
      .update(fidelityRating)
      .set(
        result.status === "COMPLETED"
          ? {
              status: result.status,
              completedAt: new Date(),
              errorMessage: null,
              model: RATING_MODEL,
              promptVersion: RATING_PROMPT_VERSION,
              promptSha256: RATING_PROMPT_SHA256,
            }
          : result,
      )
      .where(
        and(
          eq(fidelityRating.id, run.id),
          eq(fidelityRating.status, FidelityRatingStatus.PROCESSING),
          eq(fidelityRating.attempts, run.attempts),
        ),
      )
      .returning({ id: fidelityRating.id });
    if (!finished) return false;
    // A queued retry leaves the recording processing: it is still on its way to feedback.
    if (result.status === "QUEUED") return true;
    await tx
      .update(sessionRecording)
      .set(
        result.status === "COMPLETED"
          ? {
              status: RecordingProcessingStatus.COMPLETED,
              processedAt: new Date(),
              errorMessage: null,
              fidelityFeedback: result.feedback,
              overallScore: String(result.feedback.fidelity_scores.overall_score),
              promptVersion: FEEDBACK_LAYOUT,
            }
          : {
              status: RecordingProcessingStatus.FAILED,
              processedAt: new Date(),
              errorMessage: result.errorMessage,
            },
      )
      .where(eq(sessionRecording.id, run.recordingId));
    return true;
  });
}

// Ids, reasons and counts only: the transcript and the feedback describe sessions with minors.
function report(run: ClaimedRating, reason: string, message: string) {
  Sentry.captureMessage(message, {
    level: "error",
    fingerprint: ["fidelity-rating", reason],
    tags: { fidelity_rating_reason: reason },
    extra: { ratingId: run.id, recordingId: run.recordingId, attempt: run.attempts },
  });
}

async function runRating(run: ClaimedRating) {
  const label = `[fidelity rating ${run.id} attempt ${run.attempts}]`;
  if (run.attempts > MAX_ATTEMPTS) {
    const errorMessage = `Feedback generation stopped responding ${MAX_ATTEMPTS} times`;
    await finishRating(run, { status: FidelityRatingStatus.FAILED, errorMessage });
    report(run, "stopped_responding", errorMessage);
    return;
  }
  try {
    const recording = await db.query.sessionRecording.findFirst({
      where: (r, { eq }) => eq(r.id, run.recordingId),
      columns: { archivedAt: true },
      with: {
        session: { columns: {}, with: { session: { columns: { sessionName: true } } } },
        transcriptions: {
          where: (t, { eq }) => eq(t.id, run.transcriptionId),
          columns: { segments: true },
        },
      },
    });
    if (!recording) throw new Error(`Recording ${run.recordingId} not found`);
    // Archiving withdraws the recording, so its transcript must not reach Gemini.
    if (recording.archivedAt) {
      await finishRating(run, {
        status: FidelityRatingStatus.FAILED,
        errorMessage: ARCHIVED_MESSAGE,
      });
      return;
    }
    // The supervisor can move a recording to another session after it was queued.
    const sessionLine = ratedSessionLine(recording.session.session?.sessionName);
    if (!sessionLine) {
      await finishRating(run, {
        status: FidelityRatingStatus.FAILED,
        errorMessage: "Feedback is only generated for sessions 1 to 4",
      });
      return;
    }
    const segments = recording.transcriptions[0]?.segments;
    if (!segments?.length) throw new Error(`Transcription ${run.transcriptionId} has no segments`);

    const feedback = await rateTranscript(
      segments,
      sessionLine,
      AbortSignal.timeout(RUN_DEADLINE_MS),
    );
    const recorded = await finishRating(run, { status: FidelityRatingStatus.COMPLETED, feedback });
    console.log(`${label} ${recorded ? "completed" : "result dropped: claimed again"}`);
  } catch (error) {
    const errorMessage = errorMessageWithoutQuery(error).slice(0, 500);
    const status =
      run.attempts >= MAX_ATTEMPTS ? FidelityRatingStatus.FAILED : FidelityRatingStatus.QUEUED;
    await finishRating(run, { status, errorMessage });
    console.error(`${label} ${status}: ${errorMessage}`);
    if (status === FidelityRatingStatus.FAILED) report(run, "failed", errorMessage);
  }
}

export async function runQueuedRatings() {
  const runs = await claimRatings();
  await Promise.all(runs.map(runRating));
  return runs.length;
}
