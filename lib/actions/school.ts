"use server";

import { eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { hub, interventionGroup, school } from "#/db/schema";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { requireHubRole } from "#/lib/auth/require-hub-role";

/**
 * Schools the caller may see: their implementer's (admin), their hub's, or where they lead a group.
 * Wrapped in an object because awaiting a query builder runs it.
 */
async function visibleSchoolIds() {
  const membership = await requireAuthRole(
    ImplementerRole.ADMIN,
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.FELLOW,
  );
  if (membership.role === ImplementerRole.ADMIN) {
    return {
      ids: db
        .select({ id: school.id })
        .from(school)
        .innerJoin(hub, eq(hub.id, school.hubId))
        .where(eq(hub.implementerId, membership.implementerId)),
    };
  }
  const caller = await requireHubRole(
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.FELLOW,
  );
  if (caller.role === ImplementerRole.FELLOW) {
    return {
      ids: db
        .select({ id: interventionGroup.schoolId })
        .from(interventionGroup)
        .where(eq(interventionGroup.leaderId, caller.profileId)),
    };
  }
  return { ids: db.select({ id: school.id }).from(school).where(eq(school.hubId, caller.hubId)) };
}

export async function fetchSchool(visibleId: string) {
  const visibleSchools = await visibleSchoolIds();

  try {
    const row = await db.query.school.findFirst({
      where: (s, { and, eq, inArray }) =>
        and(eq(s.visibleId, visibleId), inArray(s.id, visibleSchools.ids)),
      with: {
        interventionSessions: { with: { session: true } },
        hub: { with: { sessions: true } },
        schoolDropoutHistory: { with: { user: { columns: { name: true } } } },
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
