"use server";

import { CurrentSupervisor } from "#/app/auth";
import { db } from "#/lib/db";

export async function getSchoolsForSupervisor(
  supervisor: NonNullable<CurrentSupervisor>,
) {
  const fetchedSchools = await Promise.all(
    supervisor.assignedSchools.map(async (school) => {
      const interventionSessions = await db.interventionSession.findMany({
        where: { schoolId: school.id },
      });
      return { school, interventionSessions };
    }),
  );
  return fetchedSchools;
}
