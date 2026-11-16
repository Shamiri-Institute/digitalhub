// @vitest-environment node
import { eq, inArray, sql } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db, errorMessageWithoutQuery } from "#/db/client";
import {
  fidelityRating,
  interventionSession,
  sessionName,
  sessionRecording,
  transcription,
} from "#/db/schema";
import { rerateAfterSessionChange } from "#/lib/fidelity-rating/sessions";
import { claimRatings, finishRating, runQueuedRatings } from "#/lib/fidelity-rating/worker";
import {
  claimTranscriptions,
  finishTranscription,
  runQueuedTranscriptions,
} from "#/lib/transcription/worker";

// Runs against the local database: five seeded recordings get transcription and rating runs, and the
// fields the workers write onto them are put back afterwards. The rating tests use one recording of
// session s1, which the judge rates, and one of s0, which it does not.
let recordings: Pick<
  typeof sessionRecording.$inferSelect,
  | "id"
  | "status"
  | "errorMessage"
  | "processedAt"
  | "archivedAt"
  | "fidelityFeedback"
  | "overallScore"
  | "promptVersion"
>[] = [];
let ratedRecordingId = "";
let unratedRecordingId = "";

const completedTranscript = {
  status: "COMPLETED" as const,
  completedAt: new Date(),
  errorMessage: null,
  model: "test-model",
  promptVersion: "v1",
  promptSha256: "test",
  segments: [{ start: 0, end: 1, text: "hello" }],
  gaps: [],
  audioSeconds: 1,
  chunkCount: 1,
};

beforeAll(async () => {
  const active = await db.select({ id: transcription.id }).from(transcription).limit(1);
  if (active.length)
    throw new Error("transcriptions already exist; run on a freshly seeded database");
  const seeded = await db
    .select({
      id: sessionRecording.id,
      status: sessionRecording.status,
      errorMessage: sessionRecording.errorMessage,
      processedAt: sessionRecording.processedAt,
      archivedAt: sessionRecording.archivedAt,
      fidelityFeedback: sessionRecording.fidelityFeedback,
      overallScore: sessionRecording.overallScore,
      promptVersion: sessionRecording.promptVersion,
      sessionName: sessionName.sessionName,
    })
    .from(sessionRecording)
    .innerJoin(interventionSession, eq(interventionSession.id, sessionRecording.sessionId))
    .leftJoin(sessionName, eq(sessionName.id, interventionSession.sessionId))
    .orderBy(sessionRecording.id);
  const generic = seeded.slice(0, 3);
  const rest = seeded.slice(3);
  const rated = rest.find((r) => r.sessionName === "s1");
  const unrated = rest.find((r) => r.sessionName === "s0");
  if (generic.length < 3 || !rated || !unrated)
    throw new Error("seed the database first: recordings of sessions s1 and s0");
  recordings = [...generic, rated, unrated].map((r) => ({
    id: r.id,
    status: r.status,
    errorMessage: r.errorMessage,
    processedAt: r.processedAt,
    archivedAt: r.archivedAt,
    fidelityFeedback: r.fidelityFeedback,
    overallScore: r.overallScore,
    promptVersion: r.promptVersion,
  }));
  ratedRecordingId = rated.id;
  unratedRecordingId = unrated.id;
});

// Per test, not per file: tests run in random order.
afterEach(async () => {
  const ids = recordings.map((r) => r.id);
  await db.delete(transcription).where(inArray(transcription.recordingId, ids));
  for (const { id, ...mirrored } of recordings) {
    await db
      .update(sessionRecording)
      .set(mirrored)
      .where(sql`${sessionRecording.id} = ${id}`);
  }
});

describe("transcription worker", () => {
  it("gives concurrent claims different runs, and reclaims a run whose lease expired", async () => {
    await db
      .insert(transcription)
      .values(recordings.slice(0, 2).map((r) => ({ recordingId: r.id })));

    const [first, second] = await Promise.all([claimTranscriptions(1), claimTranscriptions(1)]);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first?.[0]?.id).not.toBe(second?.[0]?.id);
    expect(await claimTranscriptions(1)).toHaveLength(0);

    const recordingStatuses = await db
      .select({ status: sessionRecording.status })
      .from(sessionRecording)
      .where(
        inArray(
          sessionRecording.id,
          recordings.slice(0, 2).map((r) => r.id),
        ),
      );
    expect(recordingStatuses.map((r) => r.status)).toEqual(["PROCESSING", "PROCESSING"]);

    const staleRun = first?.[0];
    if (!staleRun) throw new Error("no claim");
    await db
      .update(transcription)
      .set({ startedAt: new Date(Date.now() - 26 * 60_000) })
      .where(sql`${transcription.id} = ${staleRun.id}`);
    const [reclaimed] = await claimTranscriptions(1);
    expect(reclaimed).toMatchObject({ id: staleRun.id, attempts: staleRun.attempts + 1 });

    // The stale run finishing late must not overwrite the claim that replaced it.
    expect(
      await finishTranscription(staleRun, { status: "FAILED", errorMessage: "late failure" }),
    ).toBe(false);
    if (!reclaimed) throw new Error("no reclaim");
    expect(await finishTranscription(reclaimed, completedTranscript)).toBe(true);

    const [stored] = await db
      .select({ status: transcription.status, errorMessage: transcription.errorMessage })
      .from(transcription)
      .where(sql`${transcription.id} = ${staleRun.id}`);
    expect(stored).toEqual({ status: "COMPLETED", errorMessage: null });
  });

  it("fails a run whose recording was archived, without fetching its audio", async () => {
    const recordingId = recordings[2]?.id;
    if (!recordingId) throw new Error("no recording");
    await db
      .update(sessionRecording)
      .set({ archivedAt: new Date() })
      .where(sql`${sessionRecording.id} = ${recordingId}`);
    const [queued] = await db
      .insert(transcription)
      .values({ recordingId })
      .returning({ id: transcription.id });
    if (!queued) throw new Error("no run");

    expect(await runQueuedTranscriptions()).toBe(1);

    const [stored] = await db
      .select({ status: transcription.status, errorMessage: transcription.errorMessage })
      .from(transcription)
      .where(sql`${transcription.id} = ${queued.id}`);
    expect(stored).toEqual({
      status: "FAILED",
      errorMessage: "The recording was archived before it was transcribed",
    });
  });

  it("allows only one run in flight per recording", async () => {
    const recordingId = recordings[0]?.id;
    if (!recordingId) throw new Error("no recording");
    await db.insert(transcription).values({ recordingId });
    await expect(db.insert(transcription).values({ recordingId })).rejects.toThrow();
  });
});

describe("fidelity rating worker", () => {
  // A run as claimTranscriptions returns it, without claiming another test's queued runs.
  async function processingTranscription(recordingId: string) {
    const [run] = await db
      .insert(transcription)
      .values({ recordingId, status: "PROCESSING", startedAt: new Date(), attempts: 1 })
      .returning({
        id: transcription.id,
        recordingId: transcription.recordingId,
        attempts: transcription.attempts,
      });
    if (!run) throw new Error("no run");
    return run;
  }

  // A completed transcript of the recording with a rating claimed for it.
  async function claimedRating(recordingId: string) {
    const run = await processingTranscription(recordingId);
    await finishTranscription(run, completedTranscript);
    const [rating] = await claimRatings(1);
    if (!rating) throw new Error("no rating claim");
    return rating;
  }

  async function recordingRow(id: string) {
    const [row] = await db
      .select({
        status: sessionRecording.status,
        errorMessage: sessionRecording.errorMessage,
        fidelityFeedback: sessionRecording.fidelityFeedback,
        overallScore: sessionRecording.overallScore,
        promptVersion: sessionRecording.promptVersion,
      })
      .from(sessionRecording)
      .where(sql`${sessionRecording.id} = ${id}`);
    return row;
  }

  const feedback = {
    fidelity_scores: { overall_score: 5.5 },
    qualitative_feedback: { session_summary: "Session 1, fully covered." },
    safety_flags: [],
    recommendations: [],
  };

  it("queues a rating after a session's transcript, and writes the feedback onto the recording", async () => {
    const run = await processingTranscription(ratedRecordingId);
    expect(await finishTranscription(run, completedTranscript)).toBe(true);
    expect(await recordingRow(ratedRecordingId)).toMatchObject({ status: "PROCESSING" });

    const [first, second] = await Promise.all([claimRatings(1), claimRatings(1)]);
    const claimed = [...(first ?? []), ...(second ?? [])];
    expect(claimed).toMatchObject([
      { recordingId: ratedRecordingId, transcriptionId: run.id, attempts: 1 },
    ]);
    const staleRun = claimed[0];
    if (!staleRun) throw new Error("no rating claim");

    await db
      .update(fidelityRating)
      .set({ startedAt: new Date(Date.now() - 11 * 60_000) })
      .where(sql`${fidelityRating.id} = ${staleRun.id}`);
    const [reclaimed] = await claimRatings(1);
    expect(reclaimed).toMatchObject({ id: staleRun.id, attempts: 2 });
    if (!reclaimed) throw new Error("no reclaim");

    // The stale run finishing late must not overwrite the claim that replaced it.
    expect(await finishRating(staleRun, { status: "FAILED", errorMessage: "late failure" })).toBe(
      false,
    );
    expect(await finishRating(reclaimed, { status: "COMPLETED", feedback })).toBe(true);

    expect(await recordingRow(ratedRecordingId)).toEqual({
      status: "COMPLETED",
      errorMessage: null,
      fidelityFeedback: feedback,
      overallScore: "5.5",
      promptVersion: 1,
    });
    const [stored] = await db
      .select({ status: fidelityRating.status, promptVersion: fidelityRating.promptVersion })
      .from(fidelityRating)
      .where(sql`${fidelityRating.id} = ${staleRun.id}`);
    expect(stored).toEqual({ status: "COMPLETED", promptVersion: "v7" });
  });

  it("does not queue a rating for a session the judge has no checklist for", async () => {
    const run = await processingTranscription(unratedRecordingId);
    await finishTranscription(run, completedTranscript);

    expect(await recordingRow(unratedRecordingId)).toMatchObject({ status: "COMPLETED" });
    expect(await claimRatings()).toHaveLength(0);
  });

  it("fails a rating whose recording was archived, without sending its transcript", async () => {
    const [transcript] = await db
      .insert(transcription)
      .values({ recordingId: ratedRecordingId, ...completedTranscript })
      .returning({ id: transcription.id });
    if (!transcript) throw new Error("no transcript");
    await db
      .update(sessionRecording)
      .set({ archivedAt: new Date() })
      .where(sql`${sessionRecording.id} = ${ratedRecordingId}`);
    await db
      .insert(fidelityRating)
      .values({ recordingId: ratedRecordingId, transcriptionId: transcript.id });

    expect(await runQueuedRatings()).toBe(1);

    expect(await recordingRow(ratedRecordingId)).toMatchObject({
      status: "FAILED",
      errorMessage: "The recording was archived before feedback was generated",
    });
  });

  it("drops the feedback of a recording archived while it was being rated", async () => {
    const rating = await claimedRating(ratedRecordingId);
    await db
      .update(sessionRecording)
      .set({ archivedAt: new Date() })
      .where(sql`${sessionRecording.id} = ${ratedRecordingId}`);

    expect(await finishRating(rating, { status: "COMPLETED", feedback })).toBe(true);

    const recording = await recordingRow(ratedRecordingId);
    expect(recording).toMatchObject({
      status: "FAILED",
      errorMessage: "The recording was archived before feedback was generated",
    });
    expect(recording?.fidelityFeedback).not.toEqual(feedback);
  });

  it("re-rates a recording moved to a rated session, dropping the rating in flight", async () => {
    const inFlight = await claimedRating(ratedRecordingId);

    await db.transaction((tx) => rerateAfterSessionChange(tx, ratedRecordingId));

    expect(await finishRating(inFlight, { status: "COMPLETED", feedback })).toBe(false);
    expect(await recordingRow(ratedRecordingId)).toMatchObject({
      status: "PROCESSING",
      fidelityFeedback: null,
    });
    const ratings = await db
      .select({ status: fidelityRating.status })
      .from(fidelityRating)
      .where(eq(fidelityRating.recordingId, ratedRecordingId))
      .orderBy(fidelityRating.createdAt);
    expect(ratings.map((r) => r.status)).toEqual(["FAILED", "QUEUED"]);
  });

  it("clears the feedback of a recording moved to a session the judge does not rate", async () => {
    const run = await processingTranscription(unratedRecordingId);
    await finishTranscription(run, completedTranscript);
    await db
      .update(sessionRecording)
      .set({ fidelityFeedback: feedback, overallScore: "5.5", promptVersion: 1 })
      .where(sql`${sessionRecording.id} = ${unratedRecordingId}`);

    await db.transaction((tx) => rerateAfterSessionChange(tx, unratedRecordingId));

    expect(await recordingRow(unratedRecordingId)).toEqual({
      status: "COMPLETED",
      errorMessage: null,
      fidelityFeedback: null,
      overallScore: null,
      promptVersion: null,
    });
    expect(await claimRatings()).toHaveLength(0);
  });

  it("keeps a failed query's parameters out of the stored error", async () => {
    const error = await db
      .insert(fidelityRating)
      .values({ recordingId: ratedRecordingId, transcriptionId: "trn_secret_transcript_text" })
      .then(
        () => null,
        (rejected: unknown) => rejected,
      );

    expect(errorMessageWithoutQuery(error)).toBe("Database error 23503");
  });
});
