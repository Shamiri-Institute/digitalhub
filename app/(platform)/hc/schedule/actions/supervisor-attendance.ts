"use server";

import { getCurrentUser } from "#/app/auth";
import { db } from "#/lib/db";

export async function markManySupervisorAttendance(ids: string[], attended: boolean | null) {
  const user = getCurrentUser();
  if (user === null) return { success: false, message: "Unauthenticated user." };

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
      message: `Successfully marked attendance for ${data.count} supervisors.`,
      data,
    };
  } catch (error: unknown) {
    console.error(error);
    return {
      error: "Something went wrong while updating supervisor attendance",
    };
  }
}
