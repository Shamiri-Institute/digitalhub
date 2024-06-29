"use server";

import { getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";

export async function markSupervisorAttendance(id: string, attended: boolean) {
  const user = getCurrentUser();
  if (user === null)
    return { success: false, message: "Unauthenticated user." };

  try {
    const attendance = await db.supervisorAttendance.findFirst({
      where: { id },
    });

    if (attendance !== null) {
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
        message: "Successfully marked supervisor attendance.",
        data: attendance,
      };
    } else {
      throw new Error("Attendance record not found");
    }
  } catch (error: unknown) {
    console.error(error);
    return {
      error: "Something went wrong while updating supervisor attendance",
    };
  }
}

export async function markManySupervisorAttendance(
  ids: string[],
  attended: boolean | null,
) {
  const user = getCurrentUser();
  if (user === null)
    return { success: false, message: "Unauthenticated user." };

  try {
    const data = await db.supervisorAttendance.updateMany({
      where: {
        id: {
          in: ids,
        },
      },
      data: {
        attended,
      },
    });
    return {
      success: true,
      message: `Successfully marked ${data.count} supervisor attendances.`,
      data,
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      error: "Something went wrong while updating supervisor attendance",
    };
  }
}
