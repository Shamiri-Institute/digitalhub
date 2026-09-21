"use server";

import { inArray } from "drizzle-orm";

import { getCurrentPersonnel } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { supervisorAttendance } from "#/db/schema";

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
    const updated = await db
      .update(supervisorAttendance)
      .set({ attended })
      .where(inArray(supervisorAttendance.id, ids))
      .returning({ id: supervisorAttendance.id });
    const data = { count: updated.length };
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
