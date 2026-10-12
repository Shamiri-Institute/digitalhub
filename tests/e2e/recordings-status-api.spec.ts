import { expect, test } from "@playwright/test";

import { inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { sessionRecording } from "#/db/schema";
import { objectId } from "#/lib/crypto";

// The fidelity service calls these routes with the RECORDINGS_API_KEY in `x-api-key`.
// The dev server and this process must share that key, so export it before the run.
const apiKey = process.env.RECORDINGS_API_KEY;
const TEST_JOB_ID = "job_eng2222_status_api";

let testRecordingIds: string[] = [];

test.describe.configure({ mode: "serial" });

function testRecordingId(index: number) {
  const recordingId = testRecordingIds[index];
  if (!recordingId) throw new Error(`No test recording at index ${index}`);
  return recordingId;
}

async function loadRecording(recordingId: string) {
  const storedRecording = await db.query.sessionRecording.findFirst({
    where: (r, { eq }) => eq(r.id, recordingId),
  });
  if (!storedRecording) throw new Error(`Recording ${recordingId} disappeared`);
  return storedRecording;
}

test.beforeAll(async () => {
  // Three recordings of their own, in the state the fidelity service finds them in. Each copies a
  // seeded one under another group at the same school (the seed records every group's sessions),
  // archived so that no page lists it; the status routes do not look at archivedAt.
  type Copy = Pick<
    typeof sessionRecording.$inferInsert,
    | "fileName"
    | "originalFileName"
    | "s3Key"
    | "contentType"
    | "fileSize"
    | "fellowId"
    | "schoolId"
    | "groupId"
    | "sessionId"
    | "uploadedBy"
    | "supervisorId"
  >;
  const { rows } = await db.execute<Copy>(sql`
    select distinct on (r.id) 'e2e-' || r.file_name as "fileName",
      'e2e-' || r.original_file_name as "originalFileName", 'e2e/' || r.s3_key as "s3Key",
      r.content_type as "contentType", r.file_size as "fileSize", r.fellow_id as "fellowId",
      r.school_id as "schoolId", g.id as "groupId", r.intervention_session_id as "sessionId",
      r.uploaded_by as "uploadedBy", r.supervisor_id as "supervisorId"
    from session_recordings r
    join intervention_groups g on g.school_id = r.school_id and g.id <> r.group_id
    where r.archived_at is null
      and not exists (select 1 from session_recordings o
        where o.fellow_id = r.fellow_id and o.school_id = r.school_id and o.group_id = g.id
          and o.intervention_session_id = r.intervention_session_id)
    order by r.id, g.id
    limit 3`);
  if (rows.length < 3) throw new Error("seed the database first: no recordings to copy");
  const inserted = await db
    .insert(sessionRecording)
    .values(
      rows.map((copy) => ({
        ...copy,
        id: objectId("rec"),
        status: "PROCESSING" as const,
        fidelityJobId: TEST_JOB_ID,
        archivedAt: new Date(),
      })),
    )
    .returning({ id: sessionRecording.id });
  testRecordingIds = inserted.map(({ id }) => id);
});

test.afterAll(async () => {
  if (testRecordingIds.length > 0) {
    await db.delete(sessionRecording).where(inArray(sessionRecording.id, testRecordingIds));
  }
});

test("rejects status updates without a valid API key and leaves the recording unchanged", async ({
  request,
}) => {
  const recordingId = testRecordingId(0);
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
  const recordingId = testRecordingId(0);
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
  const succeededRecordingId = testRecordingId(1);
  const failedRecordingId = testRecordingId(2);
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
