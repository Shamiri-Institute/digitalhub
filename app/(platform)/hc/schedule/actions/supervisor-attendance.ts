"use server";

import { ImplementerRole } from "@prisma/client";
import { getCurrentPersonnel } from "#/app/auth";
import { db } from "#/lib/db";

export async function markManySupervisorAttendance(ids: string[], attended: boolean | null) {
  const user = await getCurrentPersonnel();
  if (!user) {
    return { success: false, message: "Unauthenticated user." };
  }
  const role = user.session.user.activeMembership?.role;
  if (!role || role !== ImplementerRole.HUB_COORDINATOR) {
    return { success: false, message: "Unauthorized user." };
  }

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
