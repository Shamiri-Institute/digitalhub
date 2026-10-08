"use server";

import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { hub, school } from "#/db/schema";
import { visibleSchoolIds } from "#/lib/auth/require-hub-role";

export async function fetchHubSchools() {
  const visibleSchools = await visibleSchoolIds();

  try {
    const schools = await db
      .select({
        visibleId: school.visibleId,
        schoolName: school.schoolName,
        hub: { hubName: hub.hubName },
      })
      .from(school)
      .leftJoin(hub, eq(school.hubId, hub.id))
      .where(inArray(school.id, visibleSchools.ids));

    return { success: true, data: schools };
  } catch (error) {
    console.error("Error fetching hub schools:", error);
    return { success: false, message: "Error fetching hub schools" };
  }
}
