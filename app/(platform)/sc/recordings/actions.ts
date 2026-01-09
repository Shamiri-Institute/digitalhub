"use server";

import { Prisma, type RecordingProcessingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { currentSupervisor } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
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

/**
 * Create a new session recording record after S3 upload
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

    revalidatePath("/sc/recordings");

    return {
      success: true,
      message: "Recording uploaded successfully",
      data: recording,
    };
  } catch (error) {
    // Handle unique constraint violation (race condition from multiple tabs)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      // Clean up orphaned S3 file
      try {
        await deleteObject({ Key: input.s3Key });
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

/**
 * Load all recordings for the current supervisor's DataTable
 */
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

  return recordings.map((recording) => ({
    id: recording.id,
    createdAt: recording.createdAt,
    fileName: recording.fileName,
    originalFileName: recording.originalFileName,
    fileSize: recording.fileSize,
    status: recording.status,
    processedAt: recording.processedAt,
    errorMessage: recording.errorMessage,
    retryCount: recording.retryCount,
    overallScore: recording.overallScore,
    fidelityFeedback: recording.fidelityFeedback,
    fellowName: recording.fellow.fellowName ?? "Unknown Fellow",
    schoolName: recording.school.schoolName,
    groupName: recording.group.groupName,
    sessionType: recording.session.sessionType ?? "Unknown",
    sessionDate: recording.session.sessionDate,
    sessionName:
      recording.session.session?.sessionName ?? recording.session.sessionType ?? "Unknown Session",
  }));
}

/**
 * Retry processing for a failed recording
 */
export async function retryRecordingProcessing(recordingId: string) {
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
        status: "FAILED",
      },
    });

    if (!recording) {
      return {
        success: false,
        message: "Recording not found or cannot be retried",
      };
    }

    await db.sessionRecording.update({
      where: { id: recordingId },
      data: {
        status: "PENDING",
        errorMessage: null,
        processedAt: null,
      },
    });

    revalidatePath("/sc/recordings");

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

/**
 * Update recording status (called by API for external service)
 */
export async function updateRecordingStatus(
  recordingId: string,
  status: RecordingProcessingStatus,
  feedback?: {
    overallScore?: string;
    fidelityFeedback?: Prisma.InputJsonValue;
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
        errorMessage: feedback?.errorMessage,
        retryCount: status === "FAILED" ? { increment: 1 } : status === "PENDING" ? 0 : undefined,
      },
    });

    // Revalidate for any supervisor viewing recordings
    revalidatePath("/sc/recordings");

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
 * Archive a recording (soft delete - internal use only)
 */
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

    revalidatePath("/sc/recordings");

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
