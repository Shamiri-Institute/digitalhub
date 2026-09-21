"use server";

import { eq } from "drizzle-orm";

import { getCurrentPersonnel, getCurrentUserSession } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { hub, school } from "#/db/schema";

export async function fetchSchool(visibleId: string) {
  const session = await getCurrentUserSession();
  if (session === null) {
    throw new Error("Unauthorized");
  }

  try {
    const row = await db.query.school.findFirst({
      where: (s, { eq }) => eq(s.visibleId, visibleId),
      with: {
        interventionSessions: { with: { session: true } },
        hub: { with: { sessions: true } },
        schoolDropoutHistory: { with: { user: true } },
      },
      // Raw SQL with a derived table on purpose: drizzle 0.45 rewrites other tables' columns inside
      // `extras` to this table's alias, and at the top level it emits the outer column unqualified
      // (`"id"`), so the inner table must not expose a column of the same name.
      extras: (s, { sql }) => ({
        interventionSessionsCount:
          sql<number>`(select count(*)::int from (select school_id from intervention_sessions) i where i.school_id = ${s.id})`.as(
            "intervention_sessions_count",
          ),
        studentsCount:
          sql<number>`(select count(*)::int from (select school_id from students where archived_at is null) st where st.school_id = ${s.id})`.as(
            "students_count",
          ),
        interventionGroupsCount:
          sql<number>`(select count(*)::int from (select school_id from intervention_groups) g where g.school_id = ${s.id})`.as(
            "intervention_groups_count",
          ),
      }),
    });

    if (!row) {
      return { success: true, data: null };
    }
    return { success: true, data: row };
  } catch (error) {
    console.error("Error fetching implementer school:", error);
    return { success: false, message: "Error fetching implementer school" };
  }
}

export type SchoolData = Awaited<ReturnType<typeof fetchSchool>>["data"];

export async function fetchHubSchools() {
  const user = await getCurrentPersonnel();
  if (user === null) {
    throw new Error("Unauthorized");
  }

  const role = user.session.user.activeMembership?.role;
  const allowedRoles: ImplementerRole[] = [
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.FELLOW,
  ];

  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Unauthorized");
  }

  let hubId: string | null = null;
  if (role === ImplementerRole.HUB_COORDINATOR) {
    const profile = user.profile as { assignedHubId?: string | null } | null;
    hubId = profile?.assignedHubId ?? null;
  } else {
    const profile = user.profile as { hubId?: string | null } | null;
    hubId = profile?.hubId ?? null;
  }

  if (!hubId) {
    throw new Error("Personnel has no assigned hub");
  }

  try {
    const schools = await db
      .select({
        visibleId: school.visibleId,
        schoolName: school.schoolName,
        hub: { hubName: hub.hubName },
      })
      .from(school)
      .leftJoin(hub, eq(school.hubId, hub.id))
      .where(eq(school.hubId, hubId));

    return { success: true, data: schools };
  } catch (error) {
    console.error("Error fetching hub schools:", error);
    return { success: false, message: "Error fetching hub schools" };
  }
}
