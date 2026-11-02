import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { cache } from "react";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  hubCoordinator,
  interventionGroup,
  interventionSession,
  school,
  student,
  supervisor,
  weeklyFellowRatings,
} from "#/db/schema";
import { countOf } from "#/db/sql";
import { getActiveProjectId } from "#/lib/active-project-id";

// drizzle-orm 0.45 rewrites every column reference inside a relational-query `extras`
// expression to the current table's alias, so a correlated subquery must name the other
// table in plain SQL and touch the current row only through the callback parameter.
// Active as the schools table's status column defines it.
const isActive = (alias: string) =>
  `${alias}.archived_at is null and ${alias}.dropped_out is not true`;

export async function fetchAdminHubs(implementerId: string, projectId: string) {
  const hubs = await db.query.hub.findMany({
    where: (h, { and, eq }) => and(eq(h.implementerId, implementerId), eq(h.projectId, projectId)),
    with: {
      implementer: { columns: { implementerName: true } },
      coordinators: { columns: { coordinatorName: true, cellNumber: true, createdAt: true } },
    },
    extras: (h, { sql }) => ({
      fellowsCount:
        sql<number>`(select count(*)::int from fellows f where f.hub_id = ${h.id} and ${sql.raw(isActive("f"))})`.as(
          "fellows_count",
        ),
      supervisorsCount:
        sql<number>`(select count(*)::int from supervisors s where s.hub_id = ${h.id} and ${sql.raw(isActive("s"))})`.as(
          "supervisors_count",
        ),
    }),
    orderBy: (h, { asc }) => [asc(h.hubName), asc(h.id)],
  });

  return hubs;
}

export type AdminHub = Awaited<ReturnType<typeof fetchAdminHubs>>[number];

const adminHubScope = cache(async () => {
  const admin = await currentAdminUser();
  const implementerId = admin?.session.user.activeMembership?.implementerId;
  if (!implementerId) {
    return null;
  }
  return { implementerId, projectId: await getActiveProjectId() };
});

export const fetchAdminHub = cache(async (hubId: string) => {
  const scope = await adminHubScope();
  if (!scope) {
    return null;
  }
  const { implementerId: adminImplementerId, projectId: activeProjectId } = scope;
  return db.query.hub.findFirst({
    where: (h, { and, eq }) =>
      and(
        eq(h.id, hubId),
        eq(h.implementerId, adminImplementerId),
        eq(h.projectId, activeProjectId),
      ),
    columns: { id: true, hubName: true },
    with: { project: { columns: { name: true } } },
    // Each tab lists every row and its badge counts the active ones.
    extras: (h, { sql }) => ({
      studentsCount:
        sql<number>`(select count(*)::int from students st join schools sc on sc.id = st.school_id where sc.hub_id = ${h.id} and ${sql.raw(isActive("st"))})`.as(
          "students_count",
        ),
      sessionsCount: countOf(
        interventionSession.hubId,
        h.id,
        sql.raw(
          `("intervention_sessions"."occurred" or "intervention_sessions"."status" is distinct from 'Cancelled') and "intervention_sessions"."archived_at" is null`,
        ),
      ).as("sessions_count"),
      schoolsCount: countOf(school.hubId, h.id, sql.raw(isActive(`"schools"`))).as("schools_count"),
      supervisorsCount: countOf(supervisor.hubId, h.id, sql.raw(isActive(`"supervisors"`))).as(
        "supervisors_count",
      ),
      fellowsCount: countOf(fellow.hubId, h.id, sql.raw(isActive(`"fellows"`))).as("fellows_count"),
      hubManagersCount: countOf(
        hubCoordinator.assignedHubId,
        h.id,
        sql.raw(`"hub_coordinators"."archived_at" is null`),
      ).as("hub_managers_count"),
    }),
  });
});

export type AdminHubDetail = NonNullable<Awaited<ReturnType<typeof fetchAdminHub>>>;

export async function fetchSiblingHubs() {
  const scope = await adminHubScope();
  if (!scope) {
    return [];
  }
  const { implementerId: adminImplementerId, projectId: activeProjectId } = scope;
  return db.query.hub.findMany({
    where: (h, { and, eq }) =>
      and(eq(h.implementerId, adminImplementerId), eq(h.projectId, activeProjectId)),
    columns: { id: true, hubName: true },
    orderBy: (h, { asc }) => [asc(h.hubName), asc(h.id)],
  });
}

// Callers pass only a hub `fetchAdminHub` returned.
export async function fetchHubManagers(hubId: string) {
  return db.query.hubCoordinator.findMany({
    where: (c, { eq }) => eq(c.assignedHubId, hubId),
    columns: {
      id: true,
      coordinatorName: true,
      coordinatorEmail: true,
      cellNumber: true,
      createdAt: true,
      archivedAt: true,
    },
    // Active managers (no archive date) first, then the most recently archived.
    orderBy: (c, { asc, desc }) => [desc(c.archivedAt), asc(c.coordinatorName), asc(c.id)],
  });
}

export type HubManager = Awaited<ReturnType<typeof fetchHubManagers>>[number];

export type SiblingHub = Awaited<ReturnType<typeof fetchSiblingHubs>>[number];

// Callers render the result only for a hub `fetchAdminHub` returned.
export async function fetchHubStats(hubId: string) {
  const hubSchoolIds = db.select({ id: school.id }).from(school).where(eq(school.hubId, hubId));
  const hubGroupIds = db
    .select({ id: interventionGroup.id })
    .from(interventionGroup)
    .where(
      and(inArray(interventionGroup.schoolId, hubSchoolIds), isNull(interventionGroup.archivedAt)),
    );
  const groupsAtSessionSchool = sql`select 1 from ${interventionGroup} where ${interventionGroup.schoolId} = ${interventionSession.schoolId} and ${interventionGroup.archivedAt} is null`;
  const notHeld = sql`not ${interventionSession.occurred} and ${interventionSession.status} is distinct from 'Cancelled'`;
  const leaderAttendanceMarked = sql`select 1 from ${fellowAttendance} where ${fellowAttendance.sessionId} = ${interventionSession.id} and ${fellowAttendance.fellowId} = ${interventionGroup.leaderId} and ${fellowAttendance.attended} is not null`;

  const [[sessions], [ratings], groups, studentsInGroups, droppedOutStudents, droppedOutFellows] =
    await Promise.all([
      db
        .select({
          held: sql<number>`count(*) filter (where ${interventionSession.occurred})::int`,
          unmarked: sql<number>`count(*) filter (where ${notHeld} and ${interventionSession.sessionDate} <= now())::int`,
          upcoming: sql<number>`count(*) filter (where ${notHeld} and ${interventionSession.sessionDate} > now())::int`,
          cancelled: sql<number>`count(*) filter (where not ${interventionSession.occurred} and ${interventionSession.status} = 'Cancelled')::int`,
          attendanceExpected: sql<number>`count(*) filter (where ${interventionSession.occurred} and exists (${groupsAtSessionSchool}))::int`,
          attendanceRecorded: sql<number>`count(*) filter (where ${interventionSession.occurred} and exists (${groupsAtSessionSchool}) and not exists (${groupsAtSessionSchool} and not exists (${leaderAttendanceMarked})))::int`,
        })
        .from(interventionSession)
        .where(and(eq(interventionSession.hubId, hubId), isNull(interventionSession.archivedAt))),
      db
        .select({
          average: sql<
            number | null
          >`((avg(${weeklyFellowRatings.behaviourRating}) + avg(${weeklyFellowRatings.dressingAndGroomingRating}) + avg(${weeklyFellowRatings.programDeliveryRating}) + avg(${weeklyFellowRatings.punctualityRating})) / 4)::float8`,
          count: sql<number>`count(*)::int`,
        })
        .from(weeklyFellowRatings)
        .innerJoin(fellow, eq(fellow.id, weeklyFellowRatings.fellowId))
        .where(eq(fellow.hubId, hubId)),
      db.$count(interventionGroup, inArray(interventionGroup.id, hubGroupIds)),
      db.$count(
        student,
        and(inArray(student.assignedGroupId, hubGroupIds), isNull(student.archivedAt)),
      ),
      db.$count(
        student,
        and(
          inArray(student.schoolId, hubSchoolIds),
          eq(student.droppedOut, true),
          isNull(student.archivedAt),
        ),
      ),
      db.$count(
        fellow,
        and(eq(fellow.hubId, hubId), eq(fellow.droppedOut, true), isNull(fellow.archivedAt)),
      ),
    ]);

  if (!sessions || !ratings) {
    throw new Error("An aggregate without GROUP BY returned no row");
  }

  return {
    sessions: { ...sessions, scheduled: sessions.held + sessions.unmarked + sessions.upcoming },
    ratings,
    groups,
    studentsInGroups,
    droppedOutStudents,
    droppedOutFellows,
  };
}

export type HubStats = Awaited<ReturnType<typeof fetchHubStats>>;
