"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { currentHubCoordinator } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import {
  findExistingRecording,
  findFellowGroups,
  findSchoolSessions,
} from "#/lib/queries/recording-queries";
import { deleteObject } from "#/lib/s3";

// Types for server action responses
export type HubFellow = Awaited<ReturnType<typeof loadHubFellows>>[number];
export type FellowGroup = Awaited<ReturnType<typeof loadFellowGroups>>[number];
export type GroupSession = Awaited<ReturnType<typeof loadGroupSessions>>[number];
export type HubRecording = Awaited<ReturnType<typeof loadHubRecordings>>[number];

/**
 * Load fellows in the current hub coordinator's hub
 */
export async function loadHubFellows() {
  const hc = await currentHubCoordinator();

  if (!hc?.profile?.id || !hc.profile.assignedHubId) {
    throw new Error("Unauthorized user");
  }

  const fellows = await db.fellow.findMany({
    where: {
      hubId: hc.profile.assignedHubId,
    },
    select: {
      id: true,
      fellowName: true,
      supervisorId: true,
    },
    orderBy: {
      fellowName: "asc",
    },
  });

  return fellows.map((f) => ({
    id: f.id,
    fellowName: f.fellowName,
    supervisorId: f.supervisorId,
  }));
}

/**
 * Load intervention groups led by a specific fellow (verified to be in HC's hub)
 */
export async function loadFellowGroups(fellowId: string) {
  const hc = await currentHubCoordinator();

  if (!hc?.profile?.id || !hc.profile.assignedHubId) {
    throw new Error("Unauthorized user");
  }

  // Verify fellow belongs to HC's hub
  const fellow = await db.fellow.findFirst({
    where: {
      id: fellowId,
      hubId: hc.profile.assignedHubId,
    },
    select: { id: true },
  });

  if (!fellow) {
    throw new Error("Fellow not found or unauthorized");
  }

  return findFellowGroups(fellowId);
}

/**
 * Load occurred sessions for a group's school (verified to be in HC's hub)
 */
export async function loadGroupSessions(groupId: string) {
  const hc = await currentHubCoordinator();

  if (!hc?.profile?.id || !hc.profile.assignedHubId) {
    throw new Error("Unauthorized user");
  }

  // Get the group and verify access through school hub
  const group = await db.interventionGroup.findFirst({
    where: {
      id: groupId,
      school: {
        hubId: hc.profile.assignedHubId,
      },
    },
    include: {
      school: true,
    },
  });

  if (!group) {
    throw new Error("Group not found or unauthorized");
  }

  return findSchoolSessions(group.schoolId);
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
  const hc = await currentHubCoordinator();

  if (!hc?.profile?.id) {
    throw new Error("Unauthorized user");
  }

  return findExistingRecording(params);
}

/**
 * Create a new session recording record after S3 upload.
 * Derives supervisorId from the selected fellow's assigned supervisor.
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
  const hc = await currentHubCoordinator();

  if (!hc?.profile?.id || !hc.session?.user?.id || !hc.profile.assignedHubId) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  // Look up fellow to derive supervisorId and verify hub membership
  const fellow = await db.fellow.findFirst({
    where: {
      id: input.fellowId,
      hubId: hc.profile.assignedHubId,
    },
    select: {
      id: true,
      supervisorId: true,
    },
  });

  if (!fellow) {
    return {
      success: false,
      message: "Fellow not found or not in your hub",
    };
  }

  if (!fellow.supervisorId) {
    return {
      success: false,
      message: "Fellow does not have an assigned supervisor",
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
        uploadedBy: hc.session.user.id,
        supervisorId: fellow.supervisorId,
        status: "PENDING",
      },
    });

    revalidatePath("/hc/reporting/recordings");
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

/**
 * Load all recordings across the hub coordinator's hub
 */
export async function loadHubRecordings() {
  const hc = await currentHubCoordinator();

  if (!hc?.profile?.id || !hc.profile.assignedHubId) {
    throw new Error("Unauthorized user");
  }

  const recordings = await db.sessionRecording.findMany({
    where: {
      school: {
        hubId: hc.profile.assignedHubId,
      },
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
      supervisor: {
        select: {
          supervisorName: true,
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
    supervisorName: recording.supervisor.supervisorName ?? "Unknown Supervisor",
  }));
}

/**
 * Retry processing for a failed recording (verified to be in HC's hub)
 */
export async function retryRecordingProcessing(recordingId: string) {
  const hc = await currentHubCoordinator();

  if (!hc?.profile?.id || !hc.profile.assignedHubId) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  try {
    const recording = await db.sessionRecording.findFirst({
      where: {
        id: recordingId,
        school: {
          hubId: hc.profile.assignedHubId,
        },
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

    revalidatePath("/hc/reporting/recordings");
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

/**
 * Archive a recording (verified to be in HC's hub)
 */
export async function archiveRecording(recordingId: string) {
  const hc = await currentHubCoordinator();

  if (!hc?.profile?.id || !hc.profile.assignedHubId) {
    return {
      success: false,
      message: "Unauthorized user",
    };
  }

  try {
    const recording = await db.sessionRecording.findFirst({
      where: {
        id: recordingId,
        school: {
          hubId: hc.profile.assignedHubId,
        },
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

    revalidatePath("/hc/reporting/recordings");
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
