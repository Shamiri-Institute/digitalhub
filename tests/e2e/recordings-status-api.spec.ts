import { expect, test } from "@playwright/test";

import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { sessionRecording } from "#/db/schema";

// The fidelity service calls these routes with the RECORDINGS_API_KEY in `x-api-key`.
// The dev server and this process must share that key, so export it before the run.
const apiKey = process.env.RECORDINGS_API_KEY;
const TEST_JOB_ID = "job_eng2222_status_api";

type RecordingSnapshot = typeof sessionRecording.$inferSelect;

let originalRecordings: RecordingSnapshot[] = [];

test.describe.configure({ mode: "serial" });

function borrowedRecordingId(index: number) {
  const borrowedRecording = originalRecordings[index];
  if (!borrowedRecording) throw new Error(`No borrowed recording at index ${index}`);
  return borrowedRecording.id;
}

async function loadRecording(recordingId: string) {
  const storedRecording = await db.query.sessionRecording.findFirst({
    where: (r, { eq }) => eq(r.id, recordingId),
  });
  if (!storedRecording) throw new Error(`Recording ${recordingId} disappeared`);
  return storedRecording;
}

test.beforeAll(async () => {
  originalRecordings = await db.query.sessionRecording.findMany({
    where: (r, { isNull }) => isNull(r.archivedAt),
    orderBy: (r, { asc }) => asc(r.id),
    limit: 3,
  });
  expect(originalRecordings).toHaveLength(3);

  // Put the borrowed seed rows in the state the fidelity service finds them in.
  await db
    .update(sessionRecording)
    .set({
      status: "PROCESSING",
      fidelityJobId: TEST_JOB_ID,
      overallScore: null,
      fidelityFeedback: null,
      transcript: null,
      errorMessage: null,
      processedAt: null,
      retryCount: 0,
    })
    .where(
      inArray(
        sessionRecording.id,
        originalRecordings.map((originalRecording) => originalRecording.id),
      ),
    );
});

test.afterAll(async () => {
  for (const { id: recordingId, ...originalValues } of originalRecordings) {
    await db
      .update(sessionRecording)
      .set(originalValues)
      .where(eq(sessionRecording.id, recordingId));
  }
});

test("rejects status updates without a valid API key and leaves the recording unchanged", async ({
  request,
}) => {
  const recordingId = borrowedRecordingId(0);
  const singleUpdate = { status: "COMPLETED", overallScore: "9.9" };
  const batchUpdate = {
    job_id: TEST_JOB_ID,
    result: { results: [{ recording_id: recordingId, status: "success" }] },
  };

  const singleWithoutKey = await request.patch(`/api/recordings/${recordingId}/status`, {
    data: singleUpdate,
  });
  expect(singleWithoutKey.status()).toBe(401);

  const singleWithWrongKey = await request.patch(`/api/recordings/${recordingId}/status`, {
    data: singleUpdate,
    headers: { "x-api-key": "not-the-key" },
  });
  expect(singleWithWrongKey.status()).toBe(401);

  const batchWithoutKey = await request.post("/api/recordings/batch/status", {
    data: batchUpdate,
  });
  expect(batchWithoutKey.status()).toBe(401);

  const batchWithWrongKey = await request.post("/api/recordings/batch/status", {
    data: batchUpdate,
    headers: { "x-api-key": "not-the-key" },
  });
  expect(batchWithWrongKey.status()).toBe(401);

  const unchangedRecording = await loadRecording(recordingId);
  expect(unchangedRecording.status).toBe("PROCESSING");
  expect(unchangedRecording.overallScore).toBeNull();
  expect(unchangedRecording.processedAt).toBeNull();
});

test("PATCH /api/recordings/[id]/status stores the status, score and feedback", async ({
  request,
}) => {
  test.skip(!apiKey, "RECORDINGS_API_KEY is not set");
  const recordingId = borrowedRecordingId(0);
  const fidelityFeedback = { summary: "Clear session", scores: { q1: 4 } };

  const response = await request.patch(`/api/recordings/${recordingId}/status`, {
    data: { status: "COMPLETED", overallScore: "4.0", fidelityFeedback },
    headers: { "x-api-key": apiKey ?? "" },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ success: true });

  const updatedRecording = await loadRecording(recordingId);
  expect(updatedRecording.status).toBe("COMPLETED");
  expect(updatedRecording.overallScore).toBe("4.0");
  expect(updatedRecording.fidelityFeedback).toEqual(fidelityFeedback);
  expect(updatedRecording.processedAt).not.toBeNull();

  const missingRecording = await request.patch("/api/recordings/rec_does_not_exist/status", {
    data: { status: "COMPLETED" },
    headers: { "x-api-key": apiKey ?? "" },
  });
  expect(missingRecording.status()).toBe(404);
});

test("POST /api/recordings/batch/status stores results from the fidelity webhook", async ({
  request,
}) => {
  test.skip(!apiKey, "RECORDINGS_API_KEY is not set");
  const succeededRecordingId = borrowedRecordingId(1);
  const failedRecordingId = borrowedRecordingId(2);
  const fidelityRatings = { overall_score: "3.5", notes: "Good pacing" };
  const transcript = { segments: [{ speaker: "fellow", text: "Welcome back" }] };

  const response = await request.post("/api/recordings/batch/status", {
    data: {
      job_id: TEST_JOB_ID,
      result: {
        succeeded: 1,
        failed: 1,
        results: [
          {
            recording_id: succeededRecordingId,
            status: "success",
            fidelity_ratings: fidelityRatings,
            transcript,
          },
          { recording_id: failedRecordingId, status: "error", error: "Audio too short" },
        ],
      },
    },
    headers: { "x-api-key": apiKey ?? "" },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ success: true, updatedCount: 2 });

  const succeededRecording = await loadRecording(succeededRecordingId);
  expect(succeededRecording.status).toBe("COMPLETED");
  expect(succeededRecording.overallScore).toBe("3.5");
  expect(succeededRecording.fidelityFeedback).toEqual(fidelityRatings);
  expect(succeededRecording.transcript).toEqual(transcript);
  expect(succeededRecording.errorMessage).toBeNull();
  expect(succeededRecording.processedAt).not.toBeNull();

  const failedRecording = await loadRecording(failedRecordingId);
  expect(failedRecording.status).toBe("FAILED");
  expect(failedRecording.errorMessage).toBe("Audio too short");
  expect(failedRecording.overallScore).toBeNull();
  expect(failedRecording.retryCount).toBe(1);

  // A retry of the same webhook finds both rows final and changes nothing.
  const retriedResponse = await request.post("/api/recordings/batch/status", {
    data: {
      job_id: TEST_JOB_ID,
      result: { results: [{ recording_id: failedRecordingId, status: "error", error: "Again" }] },
    },
    headers: { "x-api-key": apiKey ?? "" },
  });
  expect(retriedResponse.status()).toBe(200);
  expect(await retriedResponse.json()).toMatchObject({ success: true, updatedCount: 0 });
  expect((await loadRecording(failedRecordingId)).retryCount).toBe(1);
});
