"use server";

import { and, eq, sql } from "drizzle-orm";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/db/client";
import { hub, school } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";

async function requireAdminImplementerId() {
  const admin = await currentAdminUser();
  const implementerId = admin?.session.user.activeMembership?.implementerId;
  if (!implementerId) {
    throw new Error("Unauthorized");
  }
  return implementerId;
}

export async function fetchImplementerStats() {
  const implementerId = await requireAdminImplementerId();

  const projectId = await getActiveProjectId();

  try {
    const { rows: stats } = await db.execute<{
      hub_count: number;
      school_count: number;
      student_count: number;
    }>(sql`SELECT
      COUNT(DISTINCT h.id)::int AS hub_count,
      COUNT(DISTINCT sch.id)::int AS school_count,
      COUNT(DISTINCT stu.id)::int AS student_count
    FROM
      hubs h
      LEFT JOIN schools sch ON h.id = sch.hub_id
      LEFT JOIN students stu ON sch.id = stu.school_id
    WHERE
      h.implementer_id = ${implementerId}
      AND h.project_id = ${projectId}`);

    return { success: true, data: stats[0] };
  } catch (error) {
    console.error("Error fetching implementer stats:", error);
    return { success: false, message: "Error fetching implementer stats" };
  }
}

export async function fetchImplementerSchools() {
  const implementerId = await requireAdminImplementerId();

  const projectId = await getActiveProjectId();

  try {
    const schools = await db
      .select({
        visibleId: school.visibleId,
        schoolName: school.schoolName,
        hub: { hubName: hub.hubName },
      })
      .from(school)
      .innerJoin(hub, eq(school.hubId, hub.id))
      .where(and(eq(hub.implementerId, implementerId), eq(hub.projectId, projectId)));

    return { success: true, data: schools };
  } catch (error) {
    console.error("Error fetching implementer schools:", error);
    return { success: false, message: "Error fetching implementer schools" };
  }
}

export async function fetchImplementerFellowRatings() {
  const implementerId = await requireAdminImplementerId();

  const projectId = await getActiveProjectId();

  try {
    const { rows: fellowRatings } = await db.execute<{
      id: string;
      averageRating: number;
    }>(sql`SELECT
  fel.id,
  ((AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4)::float8 AS "averageRating"
  FROM
  fellows fel
  LEFT JOIN weekly_fellow_ratings wfr ON fel.id = wfr.fellow_id
  LEFT JOIN hubs h ON h.id = fel.hub_id
  WHERE h.implementer_id=${implementerId}
  AND h.project_id = ${projectId}
  GROUP BY fel.id`);
    return { success: true, data: fellowRatings };
  } catch (error) {
    console.error("Error fetching implementer fellow ratings:", error);
    return {
      success: false,
      message: "Error fetching implementer fellow ratings",
    };
  }
}

export type ImplementerFellowRating = NonNullable<
  Awaited<ReturnType<typeof fetchImplementerFellowRatings>>["data"]
>[number];
