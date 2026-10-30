"use server";

import { and, eq } from "drizzle-orm";
import { refresh, revalidatePath } from "next/cache";

import { currentSupervisor } from "#/app/auth";
import { db, isUniqueViolation } from "#/db/client";
import { RecordingProcessingStatus, TranscriptionStatus } from "#/db/enums";
import { fellow, sessionRecording, transcription } from "#/db/schema";
import { isSupervisorInFidelityAbTest } from "#/lib/fidelity-ab-test";
import {
  discardOrphanedUpload,
  verifyUploadClaim,
  verifyUploadedObject,
} from "#/lib/s3/utils/verify-upload";

export type FellowGroup = Awaited<ReturnType<typeof loadFellowGroups>>[number];
export type GroupSession = Awaited<ReturnType<typeof loadGroupSessions>>[number];
export type SupervisorRecording = Awaited<ReturnType<typeof loadSupervisorRecordings>>[number];
export type RecordingTranscript = NonNullable<Awaited<ReturnType<typeof loadRecordingTranscript>>>;

export async function loadFellowGroups(fellowId: string) {
  const supervisor = await currentSupervisor();

  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  const supervisedFellow = await db.query.fellow.findFirst({
    where: (f, { and, eq }) => and(eq(f.id, fellowId), eq(f.supervisorId, supervisor.profile.id)),
    columns: { id: true },
  });
  if (!supervisedFellow) {
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

  const supervisorId = supervisor.profile.id;
  const recording = await db.query.sessionRecording.findFirst({
    where: (r, { and, eq, inArray }) =>
      and(
        eq(r.fellowId, params.fellowId),
        inArray(
          r.fellowId,
          db.select({ id: fellow.id }).from(fellow).where(eq(fellow.supervisorId, supervisorId)),
        ),
        eq(r.schoolId, params.schoolId),
        eq(r.groupId, params.groupId),
        eq(r.sessionId, params.sessionId),
      ),
    columns: { id: true, status: true },
  });
  return recording ?? null;
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
  const supervisor = await currentSupervisor();

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
  const transcribed = isSupervisorInFidelityAbTest(supervisorId);
  try {
    recording = await db.transaction(async (tx) => {
      const [created] = await tx
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
      if (transcribed) await tx.insert(transcription).values({ recordingId: created.id });
      return created;
    });
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

  refresh();

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
      transcriptions: {
        columns: { status: true, gaps: true },
        orderBy: (t, { desc }) => desc(t.createdAt),
        limit: 1,
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
    transcriptionStatus: r.transcriptions[0]?.status ?? null,
    transcriptionGapCount: r.transcriptions[0]?.gaps?.length ?? 0,
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

/** Re-queues a failed transcription, or queues the first one for a recording uploaded earlier. */
export async function queueTranscription(recordingId: string) {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile?.id) {
    return { success: false, message: "Unauthorized user" };
  }
  const supervisorId = supervisor.profile.id;
  if (!isSupervisorInFidelityAbTest(supervisorId)) {
    return { success: false, message: "Transcription is not enabled for your account." };
  }

  const ownedRecording = await db.query.sessionRecording.findFirst({
    where: (r, { and, eq, isNull }) =>
      and(eq(r.id, recordingId), eq(r.supervisorId, supervisorId), isNull(r.archivedAt)),
    columns: { id: true },
    with: {
      transcriptions: {
        columns: { id: true, status: true },
        orderBy: (t, { desc }) => desc(t.createdAt),
        limit: 1,
      },
    },
  });
  if (!ownedRecording) {
    return { success: false, message: "Recording not found" };
  }
  const latestRun = ownedRecording.transcriptions[0];
  if (latestRun && latestRun.status !== TranscriptionStatus.FAILED) {
    return { success: false, message: "This recording is already transcribed or in progress" };
  }

  try {
    const queued = await db.transaction(async (tx) => {
      const runs = latestRun
        ? await tx
            .update(transcription)
            .set({ status: TranscriptionStatus.QUEUED, attempts: 0, errorMessage: null })
            .where(
              and(
                eq(transcription.id, latestRun.id),
                eq(transcription.status, TranscriptionStatus.FAILED),
              ),
            )
            .returning({ id: transcription.id })
        : await tx
            .insert(transcription)
            .values({ recordingId: ownedRecording.id })
            .returning({ id: transcription.id });
      if (runs.length === 0) return false;
      await tx
        .update(sessionRecording)
        .set({ status: RecordingProcessingStatus.PENDING, errorMessage: null, processedAt: null })
        .where(eq(sessionRecording.id, ownedRecording.id));
      return true;
    });
    if (!queued) {
      return { success: false, message: "This recording is already transcribed or in progress" };
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { success: false, message: "This recording is already transcribed or in progress" };
    }
    throw error;
  }

  refresh();
  return { success: true, message: "Transcription queued" };
}

export async function loadRecordingTranscript(recordingId: string) {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile?.id) {
    throw new Error("Unauthorized user");
  }
  const supervisorId = supervisor.profile.id;
  if (!isSupervisorInFidelityAbTest(supervisorId)) return null;

  const ownedRecording = await db.query.sessionRecording.findFirst({
    where: (r, { and, eq }) => and(eq(r.id, recordingId), eq(r.supervisorId, supervisorId)),
    columns: { id: true },
    with: {
      transcriptions: {
        where: (t, { eq }) => eq(t.status, TranscriptionStatus.COMPLETED),
        columns: { segments: true, gaps: true, completedAt: true },
        orderBy: (t, { desc }) => desc(t.createdAt),
        limit: 1,
      },
    },
  });
  return ownedRecording?.transcriptions[0] ?? null;
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
  const [recording, authorizedFellow, group] = await Promise.all([
    db.query.sessionRecording.findFirst({
      where: (r, { and, eq }) => and(eq(r.id, input.recordingId), eq(r.supervisorId, supervisorId)),
    }),
    db.query.fellow.findFirst({
      where: (f, { and, eq }) => and(eq(f.id, input.fellowId), eq(f.supervisorId, supervisorId)),
      columns: { id: true },
    }),
    db.query.interventionGroup.findFirst({
      where: (g, { and, eq }) => and(eq(g.id, input.groupId), eq(g.leaderId, input.fellowId)),
      columns: { schoolId: true },
    }),
  ]);

  if (!recording) {
    return { success: false, message: "Recording not found or unauthorized" };
  }

  if (!authorizedFellow) {
    return { success: false, message: "Fellow not found or unauthorized" };
  }

  if (!group) {
    return { success: false, message: "Invalid intervention group" };
  }

  const schoolId = group.schoolId;

  const [occurredSessionAtSchool, conflict] = await Promise.all([
    db.query.interventionSession.findFirst({
      where: (s, { and, eq }) =>
        and(eq(s.id, input.sessionId), eq(s.schoolId, schoolId), eq(s.occurred, true)),
      columns: { id: true },
    }),
    db.query.sessionRecording.findFirst({
      where: (r, { and, eq, ne }) =>
        and(
          eq(r.fellowId, input.fellowId),
          eq(r.schoolId, schoolId),
          eq(r.groupId, input.groupId),
          eq(r.sessionId, input.sessionId),
          ne(r.id, input.recordingId),
        ),
      columns: { id: true },
    }),
  ]);

  if (!occurredSessionAtSchool) {
    return { success: false, message: "Invalid intervention session" };
  }

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
