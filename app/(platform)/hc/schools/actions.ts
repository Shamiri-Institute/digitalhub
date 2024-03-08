"use server";

import { getCurrentPersonnel } from "#/app/auth";
import { db } from "#/lib/db";

export async function fetchSchoolData() {
  const currentHubCoordinator = await getCurrentPersonnel();

  return await db.school.findMany({
    where: {
      // @ts-ignore
      hubId: currentHubCoordinator?.assignedHubId,
    },
    include: {
      assignedSupervisor: true,
    },
  });

  return schoolsData;
}
