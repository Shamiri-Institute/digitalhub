"use server";

import { and, eq, getTableColumns, sql } from "drizzle-orm";

import { currentAdminUser } from "#/app/auth";
import { db, queryRaw } from "#/db/client";
import { hub, school, sessionName } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";

/** Ids of the hubs an implementer runs in the active project. */
function implementerHubIds(implementerId: string, projectId: string) {
  return db
    .select({ id: hub.id })
    .from(hub)
    .where(and(eq(hub.implementerId, implementerId), eq(hub.projectId, projectId)));
}

export async function fetchImplementerStats(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  const projectId = await getActiveProjectId();

  try {
    const stats = await queryRaw<{
      hub_count: number;
      school_count: number;
      student_count: number;
    }>(sql`SELECT
      COUNT(DISTINCT h.id) AS hub_count,
      COUNT(DISTINCT sch.id) AS school_count,
      COUNT(DISTINCT stu.id) AS student_count
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

export async function fetchImplementerSessionTypes(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  const projectId = await getActiveProjectId();

  try {
    // One row per distinct session name, like Prisma's `distinct: ["sessionName"]`.
    const sessionTypes = await db
      .selectDistinctOn([sessionName.sessionName], getTableColumns(sessionName))
      .from(sessionName)
      .innerJoin(hub, eq(sessionName.hubId, hub.id))
      .where(and(eq(hub.implementerId, implementerId), eq(hub.projectId, projectId)))
      .orderBy(sessionName.sessionName);

    return { success: true, data: sessionTypes };
  } catch (error) {
    console.error("Error fetching implementer session types:", error);
    return {
      success: false,
      message: "Error fetching implementer session types",
    };
  }
}

export async function fetchImplementerSchools(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

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

export async function fetchImplementerSupervisors(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  const projectId = await getActiveProjectId();

  try {
    const supervisors = await db.query.supervisor.findMany({
      where: (s, { inArray }) => inArray(s.hubId, implementerHubIds(implementerId, projectId)),
      with: {
        supervisorAttendances: {
          with: {
            session: true,
          },
        },
        fellows: {
          with: {
            fellowAttendances: true,
            groups: true,
          },
        },
        assignedSchools: true,
      },
    });
    return { success: true, data: supervisors };
  } catch (error) {
    console.error("Error fetching implementer supervisors:", error);
    return {
      success: false,
      message: "Error fetching implementer supervisors",
    };
  }
}

export type ImplementerSupervisor = NonNullable<
  Awaited<ReturnType<typeof fetchImplementerSupervisors>>["data"]
>[number];

export async function fetchImplementerFellowRatings(implementerId: string) {
  const admin = await currentAdminUser();
  if (admin === null) {
    throw new Error("Unauthorized");
  }

  const projectId = await getActiveProjectId();

  try {
    // Typed `number` like the Prisma version although AVG over no ratings is NULL; the
    // schedule components declare the same type. Tighten both together.
    const fellowRatings = await queryRaw<{
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
