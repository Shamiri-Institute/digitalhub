"use server";

import {
  currentHubCoordinator,
  currentSupervisor,
  getCurrentUser,
} from "#/app/auth";
import {
  MarkSessionOccurrenceSchema,
  RescheduleSessionSchema,
  ScheduleNewSessionSchema,
  SessionRatingsSchema,
} from "#/components/common/session/schema";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { z } from "zod";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();
  const supervisor = await currentSupervisor();

  if (!hubCoordinator && !supervisor) {
    throw new Error("The session has not been authenticated");
  }

  const user = await getCurrentUser();
  return { hubCoordinator, supervisor, user };
}

export async function createNewSession(
  data: z.infer<typeof ScheduleNewSessionSchema>,
) {
  try {
    await checkAuth();
    const parsedData = ScheduleNewSessionSchema.parse(data);
    const hubSessionType = await db.sessionName.findFirst({
      where: {
        id: parsedData.sessionId,
      },
      include: {
        hub: true,
      },
    });

    if (!hubSessionType) {
      throw new Error("Session type not found.");
    }

    const { hub } = hubSessionType;
    if (
      hubSessionType.sessionType === "SUPERVISION" ||
      hubSessionType.sessionType === "TRAINING"
    ) {
      const existingSession = await db.interventionSession.findFirst({
        where: {
          hubId: hub.id,
          sessionId: parsedData.sessionId,
        },
      });
      if (existingSession) {
        console.error(`This session already exists for hub ${hub.hubName}`);
        return {
          success: false,
          data: existingSession,
          message: `This session already exists for this hub`,
        };
      }
    } else {
      const existingSession = await db.interventionSession.findFirst({
        where: {
          schoolId: parsedData.schoolId,
          sessionId: parsedData.sessionId,
        },
        include: {
          school: true,
        },
      });
      if (existingSession) {
        console.error(
          `This session already exists for ${existingSession?.school?.schoolName}`,
        );
        return {
          success: false,
          data: existingSession,
          message: `This session already exists for ${existingSession?.school?.schoolName}`,
        };
      }
    }
    await db.interventionSession.create({
      data: {
        id: objectId("isess"),
        sessionId: parsedData.sessionId,
        sessionDate: parsedData.sessionDate,
        yearOfImplementation:
          parsedData.sessionDate.getFullYear() || new Date().getFullYear(),
        schoolId: parsedData.schoolId !== "" ? parsedData.schoolId : undefined,
        occurred: false,
        projectId: hubSessionType.hub.projectId,
        hubId: hub.id,
        venue: parsedData.venue,
      },
    });

    return {
      success: true,
      message: "Successfully scheduled new session.",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message: "Something went wrong while scheduling a new session",
    };
  }
}

export async function cancelSession(id: string) {
  try {
    const user = await checkAuth();
    const session = await db.interventionSession.findFirstOrThrow({
      where: { id },
      include: {
        school: true,
      },
    });

    if (
      session.school?.assignedSupervisorId !== user.supervisor?.id ||
      !user.hubCoordinator
    ) {
      throw new Error(`You are not assigned to ${session.school?.schoolName}`);
    }

    await db.interventionSession.update({
      data: {
        status: "Cancelled",
      },
      where: {
        id,
      },
    });

    return {
      success: true,
      message: "Successfully cancelled session.",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message:
        (error as Error)?.message ??
        "An error occurred while marking attendance.",
    };
  }
}

export async function rescheduleSession(
  id: string,
  data: z.infer<typeof RescheduleSessionSchema>,
) {
  try {
    const user = await checkAuth();
    const parsedData = RescheduleSessionSchema.parse(data);

    const session = await db.interventionSession.findFirstOrThrow({
      where: { id },
      include: {
        school: true,
      },
    });

    if (
      session.school?.assignedSupervisorId !== user.supervisor?.id &&
      !user.hubCoordinator
    ) {
      throw new Error(`You are not assigned to ${session.school?.schoolName}`);
    }

    await db.interventionSession.update({
      data: {
        sessionDate: parsedData.sessionDate,
        status: "Rescheduled",
      },
      where: {
        id,
      },
    });

    return {
      success: true,
      message: "Successfully rescheduled session.",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message:
        (error as Error)?.message ??
        "An error occurred while marking attendance.",
    };
  }
}

export async function submitQualitativeFeedback({
  notes,
  sessionId,
}: {
  notes: string;
  sessionId: string;
}) {
  try {
    const { user } = await checkAuth();
    if (!user) {
      return { success: false, message: "User not found" };
    }

    await db.sessionComment.create({
      data: {
        sessionId,
        content: notes,
        userId: user.user.id,
      },
    });
    return { success: true, message: "Notes submitted successfully" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Something went wrong" };
  }
}

export async function submitSessionRatings(
  data: z.infer<typeof SessionRatingsSchema>,
) {
  try {
    const { supervisor } = await checkAuth();
    if (!supervisor) {
      return { success: false, message: "Supervisor not found" };
    }

    const {
      studentBehaviorRating,
      workloadRating,
      adminSupportRating,
      positiveHighlights,
      challenges,
      recommendations,
      sessionId,
    } = SessionRatingsSchema.parse(data);

    await db.interventionSessionRating.upsert({
      where: {
        ratingBySessionIdAndSupervisorId: {
          sessionId,
          supervisorId: supervisor.id,
        },
      },
      create: {
        id: objectId("isr"),
        sessionId,
        supervisorId: supervisor.id,
        studentBehaviorRating,
        workloadRating,
        adminSupportRating,
        positiveHighlights,
        challenges,
        recommendations,
      },
      update: {
        sessionId,
        supervisorId: supervisor.id,
        studentBehaviorRating,
        workloadRating,
        adminSupportRating,
        positiveHighlights,
        challenges,
        recommendations,
      },
    });

    return {
      success: true,
      message: "Successfully submitted session ratings.",
    };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong while submitting session ratings" };
  }
}

export async function markSessionOccurrence(
  data: z.infer<typeof MarkSessionOccurrenceSchema>,
) {
  try {
    const auth = await checkAuth();
    if (!auth.supervisor && !auth.hubCoordinator) {
      throw new Error("Something went wrong. User is not authorized.");
    }

    const parsedData = MarkSessionOccurrenceSchema.parse(data);

    const session = await db.interventionSession.findFirstOrThrow({
      where: { id: parsedData.sessionId },
      include: {
        school: true,
        session: true,
      },
    });

    const schoolSessionTypes = ["INTERVENTION", "DATA_COLLECTION", "CLINICAL"];
    const venueSessionTypes = ["SUPERVISION", "TRAINING"];
    if (
      session.session &&
      schoolSessionTypes.includes(session.session?.sessionType) &&
      session.school?.assignedSupervisorId !== auth.supervisor?.id &&
      !auth.hubCoordinator
    ) {
      throw new Error(
        `Something went wrong. You are not assigned to ${session.school?.schoolName}`,
      );
    } else if (
      session.session &&
      venueSessionTypes.includes(session.session?.sessionType) &&
      !auth.hubCoordinator
    ) {
      throw new Error(
        `Something went wrong. You are not authorized to perform this action.`,
      );
    } else if (!session.session) {
      throw new Error(
        `Something went wrong. Session details not found ${session.school?.schoolName}`,
      );
    }

    await db.interventionSession.update({
      where: { id: parsedData.sessionId },
      data: {
        occurred: parsedData.occurrence === "attended",
      },
    });

    return {
      success: true,
      message: "Successfully updated session occurrence",
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      success: false,
      message:
        (error as Error)?.message ??
        "An error occurred while marking attendance.",
    };
  }
}
