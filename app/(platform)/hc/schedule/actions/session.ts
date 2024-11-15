"use server";

import {
  RescheduleSessionSchema,
  ScheduleNewSessionSchema,
} from "#/app/(platform)/hc/schemas";
import { getCurrentUser } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { Prisma } from "@prisma/client";
import { addHours } from "date-fns";
import { z } from "zod";

function checkAuthorizedUser() {
  const user = getCurrentUser();
  if (user === null)
    return { success: false, message: "Unauthenticated user." };
}

function generateSupervisorAttendanceVisibleId(
  supervisorId: string,
  schoolId: string,
  sessionLabel: string,
) {
  const randomString = Math.random().toString(36).substring(7);
  return `${supervisorId}_${schoolId}_${sessionLabel}_${randomString}`;
}

export async function createNewSession(
  data: z.infer<typeof ScheduleNewSessionSchema>,
) {
  checkAuthorizedUser();

  try {
    const parsedData = ScheduleNewSessionSchema.parse(data);

    const sessionTypes = {
      s0: "Presession",
      s1: "Session 01",
      s2: "Session 02",
      s3: "Session 03",
      s4: "Session 04",
    };

    const sessionEndTime = addHours(parsedData.sessionDate, 1);
    await db.interventionSession.create({
      data: {
        id: objectId("isess"),
        sessionName:
          sessionTypes[parsedData.sessionType as keyof typeof sessionTypes],
        sessionDate: parsedData.sessionDate,
        sessionType: parsedData.sessionType,
        sessionEndTime,
        yearOfImplementation:
          parsedData.sessionDate.getFullYear() || new Date().getFullYear(),
        schoolId: parsedData.schoolId,
        occurred: false,
        projectId: parsedData.projectId,
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
  checkAuthorizedUser();
  try {
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
    return { error: "Something went wrong while cancelling session" };
  }
}

export async function rescheduleSession(
  id: string,
  data: z.infer<typeof RescheduleSessionSchema>,
) {
  checkAuthorizedUser();
  try {
    const parsedData = RescheduleSessionSchema.parse(data);
    const sessionEndTime = addHours(parsedData.sessionDate, 1);

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
    return { error: "Something went wrong while rescheduling session" };
  }
}
