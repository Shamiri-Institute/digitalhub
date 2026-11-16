// @vitest-environment node
import { inArray, sql } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db } from "#/db/client";
import { fidelityRating, sessionRecording, transcription } from "#/db/schema";
import { claimRatings, finishRating, runQueuedRatings } from "#/lib/fidelity-rating/worker";
import {
  claimTranscriptions,
  finishTranscription,
  runQueuedTranscriptions,
} from "#/lib/transcription/worker";

// Runs against the local database: five seeded recordings get transcription and rating runs, and the
// fields the workers write onto them are put back afterwards.
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
  recordings = await db
    .select({
      id: sessionRecording.id,
      status: sessionRecording.status,
      errorMessage: sessionRecording.errorMessage,
      processedAt: sessionRecording.processedAt,
      archivedAt: sessionRecording.archivedAt,
      fidelityFeedback: sessionRecording.fidelityFeedback,
      overallScore: sessionRecording.overallScore,
      promptVersion: sessionRecording.promptVersion,
    })
    .from(sessionRecording)
    .orderBy(sessionRecording.id)
    .limit(5);
  if (recordings.length < 5) throw new Error("seed the database first: five session recordings");
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

  it("queues a rating after a session's transcript, and writes the feedback onto the recording", async () => {
    const recordingId = recordings[3]?.id;
    if (!recordingId) throw new Error("no recording");
    const run = await processingTranscription(recordingId);
    expect(await finishTranscription(run, completedTranscript, true)).toBe(true);
    expect(await recordingRow(recordingId)).toMatchObject({ status: "PROCESSING" });

    const [first, second] = await Promise.all([claimRatings(1), claimRatings(1)]);
    const claimed = [...(first ?? []), ...(second ?? [])];
    expect(claimed).toMatchObject([{ recordingId, transcriptionId: run.id, attempts: 1 }]);
    const staleRun = claimed[0];
    if (!staleRun) throw new Error("no rating claim");

    await db
      .update(fidelityRating)
      .set({ startedAt: new Date(Date.now() - 11 * 60_000) })
      .where(sql`${fidelityRating.id} = ${staleRun.id}`);
    const [reclaimed] = await claimRatings(1);
    expect(reclaimed).toMatchObject({ id: staleRun.id, attempts: 2 });
    if (!reclaimed) throw new Error("no reclaim");

    const feedback = {
      fidelity_scores: { overall_score: 5.5 },
      qualitative_feedback: { session_summary: "Session 1, fully covered." },
      safety_flags: [],
      recommendations: [],
    };
    // The stale run finishing late must not overwrite the claim that replaced it.
    expect(await finishRating(staleRun, { status: "FAILED", errorMessage: "late failure" })).toBe(
      false,
    );
    expect(await finishRating(reclaimed, { status: "COMPLETED", feedback })).toBe(true);

    expect(await recordingRow(recordingId)).toEqual({
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

  it("does not queue a rating for a transcript it was not asked to rate", async () => {
    const recordingId = recordings[4]?.id;
    if (!recordingId) throw new Error("no recording");
    const run = await processingTranscription(recordingId);
    await finishTranscription(run, completedTranscript);

    expect(await recordingRow(recordingId)).toMatchObject({ status: "COMPLETED" });
    expect(await claimRatings()).toHaveLength(0);
  });

  it("fails a rating whose recording was archived, without sending its transcript", async () => {
    const recordingId = recordings[4]?.id;
    if (!recordingId) throw new Error("no recording");
    const [transcript] = await db
      .insert(transcription)
      .values({ recordingId, ...completedTranscript })
      .returning({ id: transcription.id });
    if (!transcript) throw new Error("no transcript");
    await db
      .update(sessionRecording)
      .set({ archivedAt: new Date() })
      .where(sql`${sessionRecording.id} = ${recordingId}`);
    await db.insert(fidelityRating).values({ recordingId, transcriptionId: transcript.id });

    expect(await runQueuedRatings()).toBe(1);

    expect(await recordingRow(recordingId)).toMatchObject({
      status: "FAILED",
      errorMessage: "The recording was archived before feedback was generated",
    });
  });
});
