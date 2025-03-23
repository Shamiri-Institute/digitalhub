"use server";

import { RescheduleSessionSchema } from "#/app/(platform)/hc/schemas";
import {
  currentHubCoordinator,
  currentSupervisor,
  getCurrentUser,
} from "#/app/auth";
import {
  ScheduleNewSessionSchema,
  SessionRatingsSchema,
} from "#/components/common/session/schema";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";
import { addHours } from "date-fns";
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

    const sessionEndTime = addHours(parsedData.sessionDate, 1);
    await db.interventionSession.create({
      data: {
        id: objectId("isess"),
        sessionId: parsedData.sessionId,
        sessionDate: parsedData.sessionDate,
        sessionEndTime,
        yearOfImplementation:
          parsedData.sessionDate.getFullYear() || new Date().getFullYear(),
        schoolId: parsedData.schoolId,
        occurred: false,
        projectId: parsedData.projectId,
        venue: parsedData.venue,
      },
    });

    return {
      success: true,
      message: "Successfully scheduled new session.",
    };
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
      if (error.code === "P2002") {
        const parsedData = ScheduleNewSessionSchema.parse(data);
        const school = await db.school.findFirst({
          where: {
            id: parsedData.schoolId,
          },
        });
        console.error(`This session already exists for ${school!.schoolName}`);
        return {
          success: false,
          message: `Something went wrong while scheduling a new session. This session already exists for ${school!.schoolName}`,
        };
      }
    }
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
    const sessionEndTime = addHours(parsedData.sessionDate, 1);

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
        sessionDate: parsedData.sessionDate,
        sessionEndTime: new Date(sessionEndTime),
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
