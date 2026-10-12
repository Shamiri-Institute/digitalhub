import "server-only";

import { sql } from "drizzle-orm";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/db/client";
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

  const { rows: stats } = await db.execute<{
    hub_count: number;
    school_count: number;
    student_count: number;
  }>(sql`WITH
    h AS (SELECT id FROM hubs WHERE implementer_id = ${implementerId} AND project_id = ${projectId}),
    sch AS (SELECT id FROM schools WHERE hub_id IN (SELECT id FROM h))
  SELECT
    (SELECT COUNT(*) FROM h)::int AS hub_count,
    (SELECT COUNT(*) FROM sch)::int AS school_count,
    (SELECT COUNT(*) FROM students WHERE school_id IN (SELECT id FROM sch))::int AS student_count`);

  const [row] = stats;
  if (!row) {
    throw new Error("Implementer stats query returned no rows");
  }
  return row;
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
