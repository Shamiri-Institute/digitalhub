"use server";

import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { currentSupervisor, currentSupervisorLite } from "#/app/auth";
import { db, isUniqueViolation } from "#/db/client";
import type { RecordingProcessingStatus } from "#/db/enums";
import { fellow, type JsonValue, sessionRecording } from "#/db/schema";
import { isSupervisorInFidelityAbTest } from "#/lib/fidelity-ab-test";
import { createJob } from "#/lib/fidelity-ratings-api";
import {
  discardOrphanedUpload,
  verifyUploadClaim,
  verifyUploadedObject,
} from "#/lib/s3/utils/verify-upload";

export type SupervisorFellow = Awaited<ReturnType<typeof loadSupervisorFellows>>[number];
export type FellowGroup = Awaited<ReturnType<typeof loadFellowGroups>>[number];
export type GroupSession = Awaited<ReturnType<typeof loadGroupSessions>>[number];
export type SupervisorRecording = Awaited<ReturnType<typeof loadSupervisorRecordings>>[number];

export async function loadSupervisorFellows() {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  return supervisor.profile.fellows
    .filter((f) => !f.droppedOut)
    .map((f) => ({ id: f.id, fellowName: f.fellowName }))
    .toSorted((a, b) => (a.fellowName ?? "").localeCompare(b.fellowName ?? ""));
}

export async function loadFellowGroups(fellowId: string) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  const fellow = supervisor.profile.fellows.find((f) => f.id === fellowId);
  if (!fellow) {
    throw new Error("Fellow not found or unauthorized");
  }

  return db.query.interventionGroup.findMany({
    where: (g, { eq }) => eq(g.leaderId, fellowId),
    columns: { id: true, groupName: true, schoolId: true },
    with: {
      school: { columns: { id: true, schoolName: true } },
    },
    orderBy: (g, { asc }) => asc(g.groupName),
  });
}

export async function loadGroupSessions(groupId: string) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  const supervisorId = supervisor.profile.id;
  const group = await db.query.interventionGroup.findFirst({
    where: (g, { and, eq, inArray }) =>
      and(
        eq(g.id, groupId),
        inArray(
          g.leaderId,
          db.select({ id: fellow.id }).from(fellow).where(eq(fellow.supervisorId, supervisorId)),
        ),
      ),
    with: { school: true },
  });

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  const sessions = await db.query.interventionSession.findMany({
    where: (s, { and, eq }) => and(eq(s.schoolId, group.schoolId), eq(s.occurred, true)),
    columns: { id: true, sessionType: true, sessionDate: true },
    with: {
      session: { columns: { sessionName: true } },
    },
    orderBy: (s, { desc }) => desc(s.sessionDate),
  });

  return sessions.map((session) => ({
    id: session.id,
    sessionType: session.sessionType,
    sessionDate: session.sessionDate,
    sessionName: session.session?.sessionName ?? session.sessionType,
  }));
}

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

  // The unique key is (fellowId, schoolId, groupId, sessionId).
  const recording = await db.query.sessionRecording.findFirst({
    where: (r, { and, eq }) =>
      and(
        eq(r.fellowId, params.fellowId),
        eq(r.schoolId, params.schoolId),
        eq(r.groupId, params.groupId),
        eq(r.sessionId, params.sessionId),
      ),
    columns: { id: true, status: true },
  });
  return recording ?? null;
}

function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const port = process.env.PORT || "3000";
  return `http://localhost:${port}`;
}

async function submitToFidelityAPI(recordingId: string, s3Key: string): Promise<void> {
  try {
    const appUrl = getAppBaseUrl();

    const completionWebhookUrl = `${appUrl}/api/recordings/batch/status`;
    const progressWebhookUrl = undefined;

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

    const updateResult = await db
      .update(sessionRecording)
      .set({
        fidelityJobId: jobResponse.job_id,
        fidelityJobSubmittedAt: new Date(),
        status: "PROCESSING",
      })
      .where(
        and(
          eq(sessionRecording.id, recordingId),
          isNull(sessionRecording.fidelityJobId),
          notInArray(sessionRecording.status, ["COMPLETED", "FAILED"]),
        ),
      )
      .returning({ id: sessionRecording.id });

    if (updateResult.length === 0) {
      const current = await db.query.sessionRecording.findFirst({
        where: (r, { eq }) => eq(r.id, recordingId),
        columns: { status: true },
      });
      console.warn(
        `Recording ${recordingId} already in final state (${current?.status}), skipping PROCESSING update`,
      );
    }

    console.log(`Submitted recording ${recordingId} to Fidelity API as job ${jobResponse.job_id}`);
  } catch (error) {
    console.error(`✗ Failed to submit recording ${recordingId} to Fidelity API:`, error);

    try {
      const marked = await db
        .update(sessionRecording)
        .set({
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Failed to submit to Fidelity API",
        })
        .where(eq(sessionRecording.id, recordingId))
        .returning({ id: sessionRecording.id });
      if (marked.length === 0) {
        console.error(`Recording ${recordingId} not found while marking it FAILED`);
      }
    } catch (dbError) {
      console.error(`Failed to mark recording ${recordingId} as FAILED:`, dbError);
    }

    throw error;
  }
}

export async function createSessionRecording(input: {
  fellowId: string;
  schoolId: string;
  groupId: string;
  sessionId: string;
  originalFileName: string;
  s3Key: string;
  token: string;
}) {
  const supervisor = await currentSupervisorLite();

  if (!supervisor?.profile?.id || !supervisor.session?.user?.id) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  const claim = verifyUploadClaim(input.token, {
    bucket: "recordings",
    uploaderId: supervisor.session.user.id,
    key: input.s3Key,
  });
  if (claim?.bucket !== "recordings") {
    return { success: false, message: "Upload not authorized" };
  }

  const ctx = claim.context;
  if (
    ctx.fellowId !== input.fellowId ||
    ctx.groupId !== input.groupId ||
    ctx.sessionId !== input.sessionId ||
    ctx.schoolId !== input.schoolId
  ) {
    await discardOrphanedUpload(input.s3Key, "recordings");
    return { success: false, message: "Upload does not match authorized scope" };
  }

  const verified = await verifyUploadedObject(input.s3Key, "recordings");
  if (verified.status === "not-found") {
    return { success: false, message: "Uploaded file not found" };
  }
  if (verified.status === "error") {
    return {
      success: false,
      message: "Could not verify the uploaded file. Please try again.",
    };
  }

  const uploadedBy = supervisor.session.user.id;
  const supervisorId = supervisor.profile.id;

  let recording: typeof sessionRecording.$inferSelect;
  try {
    const [created] = await db
      .insert(sessionRecording)
      .values({
        id: ctx.recordingId,
        fileName: ctx.fileName,
        originalFileName: input.originalFileName,
        s3Key: input.s3Key,
        contentType: verified.contentType ?? claim.contentType,
        fileSize: verified.contentLength,
        fellowId: input.fellowId,
        schoolId: input.schoolId,
        groupId: input.groupId,
        sessionId: input.sessionId,
        uploadedBy,
        supervisorId,
        status: "PENDING",
      })
      .returning();
    if (!created) {
      throw new Error("Insert returned no row");
    }
    recording = created;
  } catch (error) {
    if (isUniqueViolation(error)) {
      const conflicting = await db.query.sessionRecording.findFirst({
        where: (r, { and, eq }) =>
          and(
            eq(r.fellowId, input.fellowId),
            eq(r.schoolId, input.schoolId),
            eq(r.groupId, input.groupId),
            eq(r.sessionId, input.sessionId),
          ),
        columns: { s3Key: true },
      });
      if (conflicting?.s3Key !== input.s3Key) {
        await discardOrphanedUpload(input.s3Key, "recordings");
      }
      return {
        success: false,
        message: "A recording already exists for this session",
      };
    }

    await discardOrphanedUpload(input.s3Key, "recordings");
    console.error("Error creating session recording:", error);
    return {
      success: false,
      message: "Failed to save recording metadata",
    };
  }

  if (!isSupervisorInFidelityAbTest(supervisor.profile.id)) {
    revalidatePath("/sc/reporting/recordings");
    return {
      success: true,
      message: "Recording uploaded successfully",
      data: recording,
    };
  }

  await submitToFidelityAPI(recording.id, recording.s3Key).catch((error) => {
    console.error(`Non-blocking Fidelity submission failed for recording ${recording.id}:`, error);
  });

  revalidatePath("/sc/reporting/recordings");

  return {
    success: true,
    message: "Recording uploaded successfully",
    data: recording,
  };
}

export async function loadSupervisorRecordings() {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  const supervisorId = supervisor.profile.id;
  const recordings = await db.query.sessionRecording.findMany({
    where: (r, { and, eq, isNull }) => and(eq(r.supervisorId, supervisorId), isNull(r.archivedAt)),
    with: {
      fellow: { columns: { fellowName: true } },
      school: { columns: { schoolName: true } },
      group: { columns: { groupName: true } },
      session: {
        columns: { sessionType: true, sessionDate: true },
        with: { session: { columns: { sessionName: true } } },
      },
    },
    orderBy: (r, { desc }) => desc(r.createdAt),
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
    const supervisorId = supervisor.profile.id;
    const recording = await db.query.sessionRecording.findFirst({
      where: (r, { and, eq }) =>
        and(eq(r.id, recordingId), eq(r.supervisorId, supervisorId), eq(r.status, "FAILED")),
    });

    if (!recording) {
      return {
        success: false,
        message: "Recording not found or cannot be retried",
      };
    }

    if (recording.status === "PENDING" || recording.status === "PROCESSING") {
      return {
        success: false,
        message: `Recording is currently ${recording.status.toLowerCase()}. Please wait for it to complete before retrying.`,
      };
    }

    const reset = await db
      .update(sessionRecording)
      .set({
        status: "PENDING",
        errorMessage: null,
        processedAt: null,
        fidelityJobId: null,
        fidelityJobSubmittedAt: null,
      })
      .where(eq(sessionRecording.id, recordingId))
      .returning({ id: sessionRecording.id });
    if (reset.length === 0) {
      throw new Error(`Recording ${recordingId} not found`);
    }

    await submitToFidelityAPI(recording.id, recording.s3Key).catch((error) => {
      console.error(
        `Non-blocking Fidelity resubmission failed for recording ${recording.id}:`,
        error,
      );
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
    const recording = await db.query.sessionRecording.findFirst({
      where: (r, { eq }) => eq(r.id, recordingId),
    });

    if (!recording) {
      return {
        success: false,
        message: "Recording not found",
      };
    }

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
      throw new Error(`Recording ${recordingId} not found`);
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

  const supervisorId = supervisor.profile.id;
  const recording = await db.query.sessionRecording.findFirst({
    where: (r, { and, eq }) => and(eq(r.id, input.recordingId), eq(r.supervisorId, supervisorId)),
  });

  if (!recording) {
    return { success: false, message: "Recording not found or unauthorized" };
  }

  const authorizedFellow = await db.query.fellow.findFirst({
    where: (f, { and, eq }) => and(eq(f.id, input.fellowId), eq(f.supervisorId, supervisorId)),
    columns: { id: true },
  });

  if (!authorizedFellow) {
    return { success: false, message: "Fellow not found or unauthorized" };
  }

  const group = await db.query.interventionGroup.findFirst({
    where: (g, { eq }) => eq(g.id, input.groupId),
    columns: { schoolId: true },
  });

  if (!group) {
    return { success: false, message: "Invalid intervention group" };
  }

  const schoolId = group.schoolId;

  const conflict = await db.query.sessionRecording.findFirst({
    where: (r, { and, eq, ne }) =>
      and(
        eq(r.fellowId, input.fellowId),
        eq(r.schoolId, schoolId),
        eq(r.groupId, input.groupId),
        eq(r.sessionId, input.sessionId),
        ne(r.id, input.recordingId),
      ),
    columns: { id: true },
  });

  if (conflict) {
    return {
      success: false,
      message: "A recording already exists for this fellow/group/session combination",
    };
  }

  try {
    const updated = await db
      .update(sessionRecording)
      .set({
        fellowId: input.fellowId,
        schoolId,
        groupId: input.groupId,
        sessionId: input.sessionId,
        originalFileName: input.originalFileName,
      })
      .where(eq(sessionRecording.id, input.recordingId))
      .returning({ id: sessionRecording.id });
    if (updated.length === 0) {
      throw new Error(`Recording ${input.recordingId} not found`);
    }

    revalidatePath("/sc/reporting/recordings");

    return { success: true, message: "Recording updated successfully" };
  } catch (error) {
    if (isUniqueViolation(error)) {
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
    const supervisorId = supervisor.profile.id;
    const recording = await db.query.sessionRecording.findFirst({
      where: (r, { and, eq }) => and(eq(r.id, recordingId), eq(r.supervisorId, supervisorId)),
    });

    if (!recording) {
      return {
        success: false,
        message: "Recording not found or unauthorized",
      };
    }

    const archived = await db
      .update(sessionRecording)
      .set({ archivedAt: new Date() })
      .where(eq(sessionRecording.id, recordingId))
      .returning({ id: sessionRecording.id });
    if (archived.length === 0) {
      throw new Error(`Recording ${recordingId} not found`);
    }

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
