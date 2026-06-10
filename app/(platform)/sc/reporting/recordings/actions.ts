"use server";

import { Prisma, type RecordingProcessingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { currentSupervisor } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { isSupervisorInFidelityAbTest } from "#/lib/fidelity-ab-test";
import { createJob } from "#/lib/fidelity-ratings-api";
import { deleteObject } from "#/lib/s3";

// Types for server action responses
export type SupervisorFellow = Awaited<ReturnType<typeof loadSupervisorFellows>>[number];
export type FellowGroup = Awaited<ReturnType<typeof loadFellowGroups>>[number];
export type GroupSession = Awaited<ReturnType<typeof loadGroupSessions>>[number];
export type SupervisorRecording = Awaited<ReturnType<typeof loadSupervisorRecordings>>[number];

/**
 * Load fellows supervised by the current user
 */
export async function loadSupervisorFellows() {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  return supervisor.profile.fellows
    .filter((f) => !f.droppedOut)
    .map((f) => ({ id: f.id, fellowName: f.fellowName }))
    .sort((a, b) => (a.fellowName ?? "").localeCompare(b.fellowName ?? ""));
}

/**
 * Load intervention groups led by a specific fellow
 */
export async function loadFellowGroups(fellowId: string) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  const fellow = supervisor.profile.fellows.find((f) => f.id === fellowId);
  if (!fellow) {
    throw new Error("Fellow not found or unauthorized");
  }

  return db.interventionGroup.findMany({
    where: {
      leaderId: fellowId,
    },
    select: {
      id: true,
      groupName: true,
      schoolId: true,
      school: {
        select: {
          id: true,
          schoolName: true,
        },
      },
    },
    orderBy: {
      groupName: "asc",
    },
  });
}

/**
 * Load occurred sessions for a group's school
 */
export async function loadGroupSessions(groupId: string) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  // Get the group and verify access through fellow (leader)
  const group = await db.interventionGroup.findFirst({
    where: {
      id: groupId,
      leader: {
        supervisorId: supervisor.profile.id,
      },
    },
    include: {
      school: true,
    },
  });

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  // Get sessions that have already occurred for this school
  const sessions = await db.interventionSession.findMany({
    where: {
      schoolId: group.schoolId,
      occurred: true,
    },
    select: {
      id: true,
      sessionType: true,
      sessionDate: true,
      session: {
        select: {
          sessionName: true,
        },
      },
    },
    orderBy: {
      sessionDate: "desc",
    },
  });

  return sessions.map((session) => ({
    id: session.id,
    sessionType: session.sessionType,
    sessionDate: session.sessionDate,
    sessionName: session.session?.sessionName ?? session.sessionType,
  }));
}

/**
 * Check if a recording already exists for the given combination
 */
export async function checkRecordingExists(params: {
  fellowId: string;
  schoolId: string;
  groupId: string;
  sessionId: string;
}) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  return db.sessionRecording.findUnique({
    where: {
      unique_recording_per_session: {
        fellowId: params.fellowId,
        schoolId: params.schoolId,
        groupId: params.groupId,
        sessionId: params.sessionId,
      },
    },
    select: {
      id: true,
      status: true,
    },
  });
}

// ---------------------------------------------------------------------------
// App URL resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the base URL for this SDH instance.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_APP_URL — explicitly set (production)
 * 2. VERCEL_URL — auto-set by Vercel deployments (needs https:// prefix)
 * 3. Fallback to http://localhost:{PORT} for local development
 *    PORT defaults to 3000 (Next.js default) if not set
 */
function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development fallback
  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}

// ---------------------------------------------------------------------------
// Fidelity API submission helper (non-exported, used internally)
// ---------------------------------------------------------------------------

/**
 * Submit a recording to the Fidelity API for async processing.
 *
 * This function:
 * 1. Constructs webhook URLs for the Fidelity API to call back
 * 2. Submits the job via the mTLS-authenticated client
 * 3. Updates the DB record with the job_id and PROCESSING status
 *
 * On failure, marks the recording as FAILED with the error message.
 *
 * @param recordingId - The SDH recording ID (e.g. "rec_xxxxx")
 * @param s3Key - The S3 key where the audio file is stored
 */
async function submitToFidelityAPI(recordingId: string, s3Key: string): Promise<void> {
  try {
    const appUrl = getAppBaseUrl();

    // Construct webhook URLs for Fidelity API callbacks
    const completionWebhookUrl = `${appUrl}/api/recordings/batch/status`;
    const progressWebhookUrl = undefined; // TODO

    console.log(`Submitting recording ${recordingId} to Fidelity API`, {
      s3Key,
      completionWebhookUrl,
    });

    const jobResponse = await createJob({
      recordings: [
        {
          id: recordingId,
          s3_key: s3Key,
        },
      ],
      completion_webhook_url: completionWebhookUrl,
      progress_webhook_url: progressWebhookUrl,
    });

    // Update recording with job tracking info and PROCESSING status
    // Only set to PROCESSING if not already in a final state
    const updateResult = await db.sessionRecording.updateMany({
      where: {
        id: recordingId,
        fidelityJobId: null,
        status: {
          notIn: ["COMPLETED", "FAILED"],
        },
      },
      data: {
        fidelityJobId: jobResponse.job_id,
        fidelityJobSubmittedAt: new Date(),
        status: "PROCESSING",
      },
    });

    // Check if the update actually happened
    if (updateResult.count === 0) {
      const current = await db.sessionRecording.findUnique({
        where: { id: recordingId },
        select: { status: true },
      });
      console.warn(
        `Recording ${recordingId} already in final state (${current?.status}), skipping PROCESSING update`,
      );
    }

    console.log(`Submitted recording ${recordingId} to Fidelity API as job ${jobResponse.job_id}`);
  } catch (error) {
    console.error(`✗ Failed to submit recording ${recordingId} to Fidelity API:`, error);

    // Mark recording as FAILED so supervisors can see the error and retry
    try {
      await db.sessionRecording.update({
        where: { id: recordingId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Failed to submit to Fidelity API",
        },
      });
    } catch (dbError) {
      // If even the DB update fails, log it but don't mask the original error
      console.error(`Failed to mark recording ${recordingId} as FAILED:`, dbError);
    }

    throw error;
  }
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

/**
 * Create a new session recording record after S3 upload, then immediately
 * submit it to the Fidelity API for processing.
 *
 * The Fidelity API submission is non-blocking — the upload succeeds even if
 * the Fidelity submission fails. Failed submissions can be retried.
 */
export async function createSessionRecording(input: {
  fellowId: string;
  schoolId: string;
  groupId: string;
  sessionId: string;
  fileName: string;
  originalFileName: string;
  s3Key: string;
  contentType: string;
  fileSize: number;
}) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id || !supervisor.session?.user?.id) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  const fellow = supervisor.profile.fellows.find((f) => f.id === input.fellowId);
  if (!fellow) {
    return {
      success: false,
      message: "Fellow not found or unauthorized",
    };
  }

  try {
    const recording = await db.sessionRecording.create({
      data: {
        id: objectId("rec"),
        fileName: input.fileName,
        originalFileName: input.originalFileName,
        s3Key: input.s3Key,
        contentType: input.contentType,
        fileSize: input.fileSize,
        fellowId: input.fellowId,
        schoolId: input.schoolId,
        groupId: input.groupId,
        sessionId: input.sessionId,
        uploadedBy: supervisor.session.user.id,
        supervisorId: supervisor.profile.id,
        status: "PENDING",
      },
    });

    if (!isSupervisorInFidelityAbTest(supervisor.profile.id)) {
      revalidatePath("/sc/reporting/recordings");
      return {
        success: true,
        message: "Recording uploaded successfully",
        data: recording,
      };
    }

    await submitToFidelityAPI(recording.id, recording.s3Key).catch((error) => {
      console.error(
        `Non-blocking Fidelity submission failed for recording ${recording.id}:`,
        error,
      );
      // TODO: Implement retry mechanism for failed submissions.
    });

    revalidatePath("/sc/reporting/recordings");

    return {
      success: true,
      message: "Recording uploaded successfully",
      data: recording,
    };
  } catch (error) {
    // Handle unique constraint violation (race condition from multiple tabs)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Clean up orphaned S3 file from recordings bucket
      try {
        await deleteObject({ Key: input.s3Key }, "recordings");
      } catch (cleanupError) {
        console.error("Failed to clean up orphaned S3 file:", input.s3Key, cleanupError);
      }

      return {
        success: false,
        message: "A recording already exists for this session",
      };
    }

    console.error("Error creating session recording:", error);
    return {
      success: false,
      message: "Failed to save recording metadata",
    };
  }
}

export async function loadSupervisorRecordings() {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  const recordings = await db.sessionRecording.findMany({
    where: {
      supervisorId: supervisor.profile.id,
      archivedAt: null,
    },
    include: {
      fellow: {
        select: {
          fellowName: true,
        },
      },
      school: {
        select: {
          schoolName: true,
        },
      },
      group: {
        select: {
          groupName: true,
        },
      },
      session: {
        select: {
          sessionType: true,
          sessionDate: true,
          session: {
            select: {
              sessionName: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const mappedRecordings = recordings.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    fileName: r.fileName,
    originalFileName: r.originalFileName,
    fileSize: r.fileSize,
    status: r.status,
    processedAt: r.processedAt,
    errorMessage: r.errorMessage,
    retryCount: r.retryCount,
    overallScore: r.overallScore,
    promptVersion: r.promptVersion,
    fidelityFeedback: r.fidelityFeedback,
    fellowId: r.fellowId,
    schoolId: r.schoolId,
    groupId: r.groupId,
    sessionId: r.sessionId,
    fellowName: r.fellow.fellowName ?? "Unknown Fellow",
    schoolName: r.school.schoolName,
    groupName: r.group.groupName,
    sessionType: r.session.sessionType ?? "Unknown",
    sessionDate: r.session.sessionDate,
    sessionName: r.session.session?.sessionName ?? r.session.sessionType ?? "Unknown Session",
  }));

  if (!isSupervisorInFidelityAbTest(supervisor.profile.id)) {
    return mappedRecordings.map((r) => ({
      ...r,
      fidelityFeedback: null,
      overallScore: null,
    }));
  }

  return mappedRecordings;
}

/**
 * Retry processing for a failed recording.
 *
 * Resets the recording to PENDING, clears previous job tracking data,
 * and immediately resubmits to the Fidelity API.
 */
export async function retryRecordingProcessing(recordingId: string) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  if (!isSupervisorInFidelityAbTest(supervisor.profile.id)) {
    return {
      success: false,
      message: "Fidelity processing is not enabled for your account.",
    };
  }

  try {
    const recording = await db.sessionRecording.findFirst({
      where: {
        id: recordingId,
        supervisorId: supervisor.profile.id,
        status: "FAILED",
      },
    });

    if (!recording) {
      return {
        success: false,
        message: "Recording not found or cannot be retried",
      };
    }
    // Only allow retry if in FINAL state (COMPLETED/FAILED)
    if (recording.status === "PENDING" || recording.status === "PROCESSING") {
      return {
        success: false,
        message: `Recording is currently ${recording.status.toLowerCase()}. Please wait for it to complete before retrying.`,
      };
    }

    // Reset to PENDING and clear previous job tracking
    await db.sessionRecording.update({
      where: { id: recordingId },
      data: {
        status: "PENDING",
        errorMessage: null,
        processedAt: null,
        fidelityJobId: null,
        fidelityJobSubmittedAt: null,
      },
    });

    // Immediately resubmit to Fidelity API (non-blocking)
    await submitToFidelityAPI(recording.id, recording.s3Key).catch((error) => {
      console.error(
        `Non-blocking Fidelity resubmission failed for recording ${recording.id}:`,
        error,
      );
      // TODO: Same retry mechanism as in createSessionRecording
    });

    revalidatePath("/sc/reporting/recordings");

    return {
      success: true,
      message: "Recording queued for reprocessing",
    };
  } catch (error) {
    console.error("Error retrying recording processing:", error);
    return {
      success: false,
      message: "Failed to retry processing",
    };
  }
}

// ---------------------------------------------------------------------------
// Batch update types and function (used by webhook endpoints)
// ---------------------------------------------------------------------------

/**
 * Type for batch recording updates from Fidelity API webhook.
 * CRITICAL: includes both transcript AND fidelityFeedback — no data loss.
 */
export type BatchRecordingUpdate = {
  id: string;
  status: RecordingProcessingStatus;
  overallScore?: string;
  fidelityFeedback?: Prisma.InputJsonValue;
  /** Full transcript JSON with speaker labels, timestamps, and prosody annotations */
  transcript?: Prisma.InputJsonValue;
  errorMessage?: string;
};

/**
 * Update recording status (called by API for external service — single recording)
 */
export async function updateRecordingStatus(
  recordingId: string,
  status: RecordingProcessingStatus,
  feedback?: {
    overallScore?: string;
    fidelityFeedback?: Prisma.InputJsonValue;
    transcript?: Prisma.InputJsonValue;
    errorMessage?: string;
  },
) {
  try {
    const recording = await db.sessionRecording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      return {
        success: false,
        message: "Recording not found",
      };
    }

    await db.sessionRecording.update({
      where: { id: recordingId },
      data: {
        status,
        processedAt: status === "COMPLETED" || status === "FAILED" ? new Date() : undefined,
        overallScore: feedback?.overallScore,
        fidelityFeedback: feedback?.fidelityFeedback,
        transcript: feedback?.transcript,
        errorMessage: feedback?.errorMessage,
        retryCount: status === "FAILED" ? { increment: 1 } : status === "PENDING" ? 0 : undefined,
      },
    });

    // Revalidate for any supervisor viewing recordings
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

/**
 * Batch update recording statuses using PostgreSQL unnest() pattern.
 *
 * This function performs an atomic batch update — all recordings are updated
 * in a single SQL statement. If any recording ID is not found, the entire
 * batch fails (validated before the update).
 *
 * CRITICAL: This function stores BOTH transcript AND fidelityFeedback.
 * The unnest() arrays must all have matching lengths.
 */
export async function updateRecordingsStatusBatch(
  updates: BatchRecordingUpdate[],
): Promise<{ success: boolean; message: string; updatedCount: number }> {
  try {
    // Validate no duplicate IDs in input (would cause non-deterministic updates)
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

    // Validate all recording IDs exist before updating
    const existingRecordings = await db.sessionRecording.findMany({
      where: { id: { in: recordingIds } },
      select: { id: true },
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

    // Build arrays for the UPDATE FROM unnest() pattern.
    // Use empty string as sentinel for NULL values since Prisma cannot serialize
    // arrays containing null values in raw queries. See:
    // - https://github.com/prisma/prisma/issues/26545
    // - https://github.com/prisma/prisma/issues/26335
    const NULL_SENTINEL = "";
    const ids: string[] = [];
    const statuses: string[] = [];
    const overallScores: string[] = [];
    const fidelityFeedbacks: string[] = [];
    const transcripts: string[] = []; // NEW — stores full transcript JSON
    const errorMessages: string[] = [];

    for (const update of updates) {
      ids.push(update.id);
      statuses.push(update.status);
      overallScores.push(update.overallScore ?? NULL_SENTINEL);
      fidelityFeedbacks.push(
        update.fidelityFeedback != null ? JSON.stringify(update.fidelityFeedback) : NULL_SENTINEL,
      );
      // CRITICAL: transcript must be included — this is the full processed transcript
      transcripts.push(
        update.transcript != null ? JSON.stringify(update.transcript) : NULL_SENTINEL,
      );
      errorMessages.push(update.errorMessage ?? NULL_SENTINEL);
    }

    // Atomic batch update using PostgreSQL unnest()
    // CRITICAL: The unnest() parameter count and the AS t(...) column list must match exactly
    const updatedCount = await db.$executeRaw`
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
          ${ids}::text[],
          ${statuses}::text[],
          ${overallScores}::text[],
          ${fidelityFeedbacks}::text[],
          ${transcripts}::text[],
          ${errorMessages}::text[]
        ) AS t(id, status, overall_score, fidelity_feedback, transcript, error_message)
      ) AS data
      WHERE sr.id = data.id
        AND sr.status IN ('PENDING', 'PROCESSING')
        AND sr."fidelity_job_id" IS NOT NULL
    `;

    revalidatePath("/sc/reporting/recordings");

    return {
      success: true,
      message: `Successfully updated ${updatedCount} recording(s)`,
      updatedCount: Number(updatedCount),
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

/**
 * Update editable metadata on an existing session recording.
 * The S3 file is never touched — only the DB record is updated.
 *
 * schoolId is intentionally NOT accepted from the client. It is derived
 * server-side from groupId to prevent mismatched group/school pairs.
 */
export async function updateSessionRecording(input: {
  recordingId: string;
  fellowId: string;
  groupId: string;
  sessionId: string;
  originalFileName: string;
}) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    return { success: false, message: "Unauthorized user" };
  }

  // Verify ownership of the recording
  const recording = await db.sessionRecording.findFirst({
    where: {
      id: input.recordingId,
      supervisorId: supervisor.profile.id,
    },
  });

  if (!recording) {
    return { success: false, message: "Recording not found or unauthorized" };
  }

  // Verify fellow belongs to this supervisor via the database — do not rely on
  // the session payload, which may not eagerly load the fellows array.
  const authorizedFellow = await db.fellow.findFirst({
    where: { id: input.fellowId, supervisorId: supervisor.profile.id },
    select: { id: true },
  });

  if (!authorizedFellow) {
    return { success: false, message: "Fellow not found or unauthorized" };
  }

  // Derive schoolId server-side from the group — never trust the client for this.
  // A mismatched groupId/schoolId pair would corrupt relational integrity.
  const group = await db.interventionGroup.findUnique({
    where: { id: input.groupId },
    select: { schoolId: true },
  });

  if (!group) {
    return { success: false, message: "Invalid intervention group" };
  }

  const schoolId = group.schoolId;

  // Pre-flight uniqueness check (excludes the current recording).
  // A P2002 catch below handles the residual race-condition window.
  const conflict = await db.sessionRecording.findFirst({
    where: {
      fellowId: input.fellowId,
      schoolId,
      groupId: input.groupId,
      sessionId: input.sessionId,
      id: { not: input.recordingId },
    },
    select: { id: true },
  });

  if (conflict) {
    return {
      success: false,
      message: "A recording already exists for this fellow/group/session combination",
    };
  }

  try {
    await db.sessionRecording.update({
      where: { id: input.recordingId },
      data: {
        fellowId: input.fellowId,
        schoolId,
        groupId: input.groupId,
        sessionId: input.sessionId,
        originalFileName: input.originalFileName,
      },
    });

    revalidatePath("/sc/reporting/recordings");

    return { success: true, message: "Recording updated successfully" };
  } catch (error) {
    // Catch the unique constraint violation that can still occur in the narrow
    // race window between the pre-flight check and the update above.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        message: "A recording already exists for this combination",
      };
    }
    console.error("Error updating session recording:", error);
    return { success: false, message: "Failed to update recording" };
  }
}

export async function archiveRecording(recordingId: string) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  try {
    const recording = await db.sessionRecording.findFirst({
      where: {
        id: recordingId,
        supervisorId: supervisor.profile.id,
      },
    });

    if (!recording) {
      return {
        success: false,
        message: "Recording not found or unauthorized",
      };
    }

    await db.sessionRecording.update({
      where: { id: recordingId },
      data: {
        archivedAt: new Date(),
      },
    });

    revalidatePath("/sc/reporting/recordings");

    return {
      success: true,
      message: "Recording archived",
    };
  } catch (error) {
    console.error("Error archiving recording:", error);
    return {
      success: false,
      message: "Failed to archive recording",
    };
  }
}
