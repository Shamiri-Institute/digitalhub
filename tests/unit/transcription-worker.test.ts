// @vitest-environment node
import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { db, pool } from "#/db/client";
import { sessionRecording, transcription } from "#/db/schema";
import { claimTranscriptions, finishTranscription } from "#/lib/transcription/worker";

// Runs against the local database: two seeded recordings get transcription runs, and the fields
// the worker mirrors onto them are put back afterwards.
let recordings: Pick<
  typeof sessionRecording.$inferSelect,
  "id" | "status" | "errorMessage" | "processedAt"
>[] = [];

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
    })
    .from(sessionRecording)
    .orderBy(sessionRecording.id)
    .limit(2);
  if (recordings.length < 2) throw new Error("seed the database first: two session recordings");
});

afterAll(async () => {
  const ids = recordings.map((r) => r.id);
  await db.delete(transcription).where(inArray(transcription.recordingId, ids));
  for (const { id, ...mirrored } of recordings) {
    await db
      .update(sessionRecording)
      .set(mirrored)
      .where(sql`${sessionRecording.id} = ${id}`);
  }
  await pool.end();
});

describe("transcription worker", () => {
  it("gives concurrent claims different runs, and reclaims a run whose lease expired", async () => {
    await db.insert(transcription).values(recordings.map((r) => ({ recordingId: r.id })));

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
          recordings.map((r) => r.id),
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
    expect(
      await finishTranscription(reclaimed, {
        status: "COMPLETED",
        completedAt: new Date(),
        errorMessage: null,
        model: "test-model",
        promptVersion: "v1",
        promptSha256: "test",
        segments: [{ start: 0, end: 1, text: "hello" }],
        gaps: [],
        audioSeconds: 1,
        chunkCount: 1,
      }),
    ).toBe(true);

    const [stored] = await db
      .select({ status: transcription.status, errorMessage: transcription.errorMessage })
      .from(transcription)
      .where(sql`${transcription.id} = ${staleRun.id}`);
    expect(stored).toEqual({ status: "COMPLETED", errorMessage: null });
  });

  it("allows only one run in flight per recording", async () => {
    const recordingId = recordings[0]?.id;
    if (!recordingId) throw new Error("no recording");
    await db.insert(transcription).values({ recordingId });
    await expect(db.insert(transcription).values({ recordingId })).rejects.toThrow();
  });
});
