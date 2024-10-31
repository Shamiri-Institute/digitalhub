"use server";

import {
  currentHubCoordinator,
  currentSupervisor,
  getCurrentUser,
} from "#/app/auth";
import { db } from "#/lib/db";

async function checkAuth() {
  const hubCoordinator = await currentHubCoordinator();
  const supervisor = await currentSupervisor();

  if (!hubCoordinator && !supervisor) {
    throw new Error("The session has not been authenticated");
  }

  const user = await getCurrentUser();
  return { hubCoordinator, supervisor, user };
}

export async function archiveInterventionGroup(groupId: string) {
  try {
    await checkAuth();
    const result = await db.interventionGroup.update({
      where: {
        id: groupId,
      },
      data: {
        archivedAt: new Date(),
      },
    });
    return {
      success: true,
      message: `Successfully archived group ${result.groupName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not archive group.",
    };
  }
}
