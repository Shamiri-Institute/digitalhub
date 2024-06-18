"use server";

import { MarkSupervisorAttendanceSchema } from "#/app/(platform)/hc/schemas";
import { getCurrentUser } from "#/app/auth";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { z } from "zod";

function generateSupervisorAttendanceVisibleId(
  supervisorId: string,
  schoolId: string,
  sessionLabel: string,
) {
  const randomString = Math.random().toString(36).substring(7);
  return `${supervisorId}_${schoolId}_${sessionLabel}_${randomString}`;
}

export async function markSupervisorAttendance(
  data: z.infer<typeof MarkSupervisorAttendanceSchema>,
) {
  const user = getCurrentUser();
  if (user === null)
    return { success: false, message: "Unauthenticated user." };

  try {
    const {
      projectId,
      sessionType,
      sessionId,
      schoolId,
      supervisorId,
      attended,
    } = MarkSupervisorAttendanceSchema.parse(data);

    const attendance = await db.supervisorAttendance.findFirst({
      where: { supervisorId, schoolId, sessionId },
    });

    if (attendance === null) {
      const visibleId = generateSupervisorAttendanceVisibleId(
        supervisorId,
        schoolId,
        sessionType,
      );
      const newAttendance = await db.supervisorAttendance.create({
        data: {
          id: objectId("supatt"),
          visibleId,
          projectId,
          supervisorId,
          sessionId,
          schoolId,
          attended,
        },
      });
      return {
        success: true,
        message: "Successfully marked supervisor attendance.",
        data: newAttendance,
      };
    } else {
      await db.supervisorAttendance.update({
        where: {
          id: attendance.id,
        },
        data: {
          attended,
        },
      });
      return {
        success: true,
        message: "Successfully updated supervisor attendance.",
      };
    }
  } catch (error: unknown) {
    console.error(error);
    return {
      error: "Something went wrong while updating supervisor attendance",
    };
  }
}
