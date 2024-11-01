"use server";

import {
  currentHubCoordinator,
  currentSupervisor,
  getCurrentUser,
} from "#/app/auth";
import { CreateGroupSchema } from "#/components/common/group/schema";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { objectId } from "#/lib/crypto";
import { db } from "#/lib/db";
import { getSchoolInitials } from "#/lib/utils";
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

export async function createInterventionGroup(
  data: z.infer<typeof CreateGroupSchema>,
) {
  try {
    const { hubCoordinator, supervisor } = await checkAuth();
    const { schoolId, fellowId } = CreateGroupSchema.parse(data);
    const school = await db.school.findFirstOrThrow({
      where: {
        id: schoolId,
      },
    });
    const groupCount = await db.interventionGroup.count({
      where: { schoolId },
    });

    const result = await db.interventionGroup.create({
      data: {
        id: objectId("group"),
        leaderId: fellowId,
        schoolId,
        projectId:
          hubCoordinator?.assignedHub?.projectId ??
          supervisor?.hub?.projectId ??
          CURRENT_PROJECT_ID,
        groupName: `${getSchoolInitials(school.schoolName)}_${groupCount + 1}`,
      },
    });
    return {
      success: true,
      message: `Successfully create new group ${result.groupName}`,
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: (err as Error)?.message ?? "Sorry, could not create group.",
    };
  }
}
