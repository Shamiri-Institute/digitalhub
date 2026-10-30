import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { cache } from "react";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  interventionGroup,
  interventionSession,
  school,
  student,
  weeklyFellowRatings,
} from "#/db/schema";
import { countOf } from "#/db/sql";
import { getActiveProjectId } from "#/lib/active-project-id";

// drizzle-orm 0.45 rewrites every column reference inside a relational-query `extras`
// expression to the current table's alias, so a correlated subquery must name the other
// table in plain SQL and touch the current row only through the callback parameter.
const notDroppedOut = (alias: string) =>
  `(${alias}.dropped_out = false or ${alias}.dropped_out is null)`;

export async function fetchAdminHubs(implementerId: string, projectId: string) {
  const hubs = await db.query.hub.findMany({
    where: (h, { and, eq }) => and(eq(h.implementerId, implementerId), eq(h.projectId, projectId)),
    with: {
      implementer: { columns: { implementerName: true } },
      coordinators: { columns: { coordinatorName: true, cellNumber: true, createdAt: true } },
    },
    extras: (h, { sql }) => ({
      fellowsCount:
        sql<number>`(select count(*)::int from fellows f where f.hub_id = ${h.id} and ${sql.raw(notDroppedOut("f"))})`.as(
          "fellows_count",
        ),
      supervisorsCount:
        sql<number>`(select count(*)::int from supervisors s where s.hub_id = ${h.id} and ${sql.raw(notDroppedOut("s"))})`.as(
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
    extras: (h) => ({
      schoolsCount: countOf(school.hubId, h.id).as("schools_count"),
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

export type SiblingHub = Awaited<ReturnType<typeof fetchSiblingHubs>>[number];

// Caller passes a hub id already checked by `fetchAdminHub`.
export async function fetchHubStats(hubId: string) {
  const hubSchoolIds = db.select({ id: school.id }).from(school).where(eq(school.hubId, hubId));
  const hubGroupIds = db
    .select({ id: interventionGroup.id })
    .from(interventionGroup)
    .where(
      and(inArray(interventionGroup.schoolId, hubSchoolIds), isNull(interventionGroup.archivedAt)),
    );
  const groupsAtSessionSchool = sql`select 1 from ${interventionGroup} where ${interventionGroup.schoolId} = ${interventionSession.schoolId} and ${interventionGroup.archivedAt} is null`;
  const leaderAttendanceMarked = sql`select 1 from ${fellowAttendance} where ${fellowAttendance.sessionId} = ${interventionSession.id} and ${fellowAttendance.fellowId} = ${interventionGroup.leaderId} and ${fellowAttendance.attended} is not null`;

  const [[sessions], [ratings], groups, studentsInGroups, droppedOutStudents, droppedOutFellows] =
    await Promise.all([
      db
        .select({
          held: sql<number>`count(*) filter (where ${interventionSession.occurred})::int`,
          upcoming: sql<number>`count(*) filter (where not ${interventionSession.occurred} and ${interventionSession.status} is distinct from 'Cancelled' and ${interventionSession.sessionDate} > now())::int`,
          cancelled: sql<number>`count(*) filter (where not ${interventionSession.occurred} and ${interventionSession.status} = 'Cancelled')::int`,
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
      db.$count(fellow, and(eq(fellow.hubId, hubId), eq(fellow.droppedOut, true))),
    ]);

  if (!sessions || !ratings) {
    throw new Error("An aggregate without GROUP BY returned no row");
  }

  return {
    sessions: { ...sessions, scheduled: sessions.held + sessions.upcoming },
    ratings,
    groups,
    studentsInGroups,
    droppedOutStudents,
    droppedOutFellows,
  };
}

export type HubStats = Awaited<ReturnType<typeof fetchHubStats>>;
