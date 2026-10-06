import "server-only";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "#/db/client";
import type { RecordingProcessingStatus } from "#/db/enums";
import { type JsonValue, sessionRecording } from "#/db/schema";

// Only the API routes in app/api/recordings call these, after they check the API key.
// Do not move them into a "use server" file: its exports can become server actions
// that skip the key check.

export type BatchRecordingUpdate = {
  id: string;
  status: RecordingProcessingStatus;
  overallScore?: string;
  fidelityFeedback?: JsonValue;
  transcript?: JsonValue;
  errorMessage?: string;
};

export async function updateRecordingStatus(
  recordingId: string,
  status: RecordingProcessingStatus,
  feedback?: {
    overallScore?: string;
    fidelityFeedback?: JsonValue;
    transcript?: JsonValue;
    errorMessage?: string;
  },
) {
  try {
    const updated = await db
      .update(sessionRecording)
      .set({
        status,
        processedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
        overallScore: feedback?.overallScore,
        fidelityFeedback: feedback?.fidelityFeedback,
        transcript: feedback?.transcript,
        errorMessage: feedback?.errorMessage,
        retryCount:
          status === "FAILED"
            ? sql`${sessionRecording.retryCount} + 1`
            : status === "PENDING"
              ? 0
              : undefined,
      })
      .where(eq(sessionRecording.id, recordingId))
      .returning({ id: sessionRecording.id });
    if (updated.length === 0) {
      return {
        success: false,
        message: "Recording not found",
      };
    }

    revalidatePath("/sc/reporting/recordings");

    return {
      success: true,
      message: "Recording status updated",
    };
  } catch (error) {
    console.error("Error updating recording status:", error);
    return {
      success: false,
      message: "Failed to update recording status",
    };
  }
}

export async function updateRecordingsStatusBatch(
  updates: BatchRecordingUpdate[],
): Promise<{ success: boolean; message: string; updatedCount: number }> {
  try {
    const recordingIds = updates.map((u) => u.id);
    const uniqueIds = new Set(recordingIds);
    if (uniqueIds.size !== recordingIds.length) {
      const duplicates = recordingIds.filter((id, index) => recordingIds.indexOf(id) !== index);
      const uniqueDuplicates = Array.from(new Set(duplicates));
      return {
        success: false,
        message: `Duplicate recording IDs not allowed: ${uniqueDuplicates.join(", ")}`,
        updatedCount: 0,
      };
    }

    const existingRecordings = await db.query.sessionRecording.findMany({
      where: (r, { inArray }) => inArray(r.id, recordingIds),
      columns: { id: true },
    });

    const existingIds = new Set(existingRecordings.map((r) => r.id));
    const missingIds = recordingIds.filter((id) => !existingIds.has(id));

    if (missingIds.length > 0) {
      return {
        success: false,
        message: `Recordings not found: ${missingIds.join(", ")}`,
        updatedCount: 0,
      };
    }

    const NULL_SENTINEL = "";
    const ids: string[] = [];
    const statuses: string[] = [];
    const overallScores: string[] = [];
    const fidelityFeedbacks: string[] = [];
    const transcripts: string[] = [];
    const errorMessages: string[] = [];

    for (const update of updates) {
      ids.push(update.id);
      statuses.push(update.status);
      overallScores.push(update.overallScore ?? NULL_SENTINEL);
      fidelityFeedbacks.push(
        update.fidelityFeedback != null ? JSON.stringify(update.fidelityFeedback) : NULL_SENTINEL,
      );
      transcripts.push(
        update.transcript != null ? JSON.stringify(update.transcript) : NULL_SENTINEL,
      );
      errorMessages.push(update.errorMessage ?? NULL_SENTINEL);
    }

    const { rowCount } = await db.execute(sql`
      UPDATE "session_recordings" AS sr
      SET
        status = data.status::"recording_processing_status",
        "overall_score" = NULLIF(data.overall_score, ''),
        "fidelity_feedback" = NULLIF(data.fidelity_feedback, '')::jsonb,
        "transcript" = NULLIF(data.transcript, '')::jsonb,
        "error_message" = NULLIF(data.error_message, ''),
        "processed_at" = CASE
          WHEN data.status IN ('COMPLETED', 'FAILED') THEN NOW()
          ELSE sr."processed_at"
        END,
        "retry_count" = CASE
          WHEN data.status = 'FAILED' THEN sr."retry_count" + 1
          WHEN data.status = 'PENDING' THEN 0
          ELSE sr."retry_count"
        END,
        "updated_at" = NOW()
      FROM (
        SELECT * FROM unnest(
          ${sql.param(ids)}::text[],
          ${sql.param(statuses)}::text[],
          ${sql.param(overallScores)}::text[],
          ${sql.param(fidelityFeedbacks)}::text[],
          ${sql.param(transcripts)}::text[],
          ${sql.param(errorMessages)}::text[]
        ) AS t(id, status, overall_score, fidelity_feedback, transcript, error_message)
      ) AS data
      WHERE sr.id = data.id
        AND sr.status IN ('PENDING', 'PROCESSING')
        AND sr."fidelity_job_id" IS NOT NULL
    `);
    const updatedCount = rowCount ?? 0;

    revalidatePath("/sc/reporting/recordings");

    return {
      success: true,
      message: `Successfully updated ${updatedCount} recording(s)`,
      updatedCount,
    };
  } catch (error) {
    console.error("Error updating recording statuses in batch:", error);
    return {
      success: false,
      message: "Failed to update recording statuses",
      updatedCount: 0,
    };
  }
}
