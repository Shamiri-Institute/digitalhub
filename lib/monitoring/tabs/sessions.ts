import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  max,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { db } from "#/db/client";
import { fellowAttendance, hub, interventionSession, school, student } from "#/db/schema";
import {
  dayInViewerZone,
  matchesIfSet,
  minuteInViewerZone,
  startOfTodayInViewerZone,
} from "#/lib/monitoring/sql";
import type { MonitoringFilters, MonitoringTab, TableColumn } from "#/lib/monitoring/types";

const actualSessions = countDistinct(fellowAttendance.id);
const targetSessions = sql<number>`4 * count(distinct ${student.assignedGroupId})`.mapWith(Number);
const gapPercent =
  sql<number>`100 * (4 * count(distinct ${student.assignedGroupId}) - count(distinct ${fellowAttendance.id}))::float / nullif(4 * count(distinct ${student.assignedGroupId}), 0)`.mapWith(
    Number,
  );

function coreSessionAttendanceConditions(filters: MonitoringFilters) {
  return and(
    eq(fellowAttendance.attended, true),
    eq(interventionSession.projectId, filters.projectId),
    inArray(interventionSession.sessionType, ["s1", "s2", "s3", "s4"]),
    eq(hub.id, filters.hubId),
    matchesIfSet(school.id, filters.schoolId),
  );
}

async function groupSessionCount(filters: MonitoringFilters) {
  return db
    .select({ groupSessions: count() })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        coreSessionAttendanceConditions(filters),
        matchesIfSet(fellowAttendance.supervisorId, filters.supervisorId),
      ),
    );
}

async function deliveryVsTarget(filters: MonitoringFilters) {
  return db
    .select({ actualSessions, targetSessions, gapPercent })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(student, eq(fellowAttendance.groupId, student.assignedGroupId))
    .where(and(coreSessionAttendanceConditions(filters)));
}

async function groupSessionsPerSessionType(filters: MonitoringFilters) {
  return db
    .select({ sessionType: interventionSession.sessionType, groupSessions: count() })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(fellowAttendance.attended, true),
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(fellowAttendance.supervisorId, filters.supervisorId),
      ),
    )
    .groupBy(interventionSession.sessionType)
    .orderBy(asc(interventionSession.sessionType));
}

async function deliveryVsTargetByHub(filters: MonitoringFilters) {
  return db
    .select({ hubName: hub.hubName, actualSessions, targetSessions, gapPercent })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(student, eq(fellowAttendance.groupId, student.assignedGroupId))
    .where(
      and(
        coreSessionAttendanceConditions(filters),
        matchesIfSet(fellowAttendance.supervisorId, filters.supervisorId),
        matchesIfSet(fellowAttendance.fellowId, filters.fellowId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(hub.hubName));
}

async function deliveryVsTargetByHubAndSchool(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      schoolName: school.schoolName,
      actualSessions,
      targetSessions,
      gapPercent,
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(student, eq(fellowAttendance.groupId, student.assignedGroupId))
    .where(
      and(
        coreSessionAttendanceConditions(filters),
        matchesIfSet(fellowAttendance.supervisorId, filters.supervisorId),
        matchesIfSet(fellowAttendance.fellowId, filters.fellowId),
      ),
    )
    .groupBy(hub.hubName, school.schoolName)
    .orderBy(asc(hub.hubName), asc(school.schoolName));
}

function schoolSessionColumns(timeZone: string) {
  return {
    schoolName: school.schoolName,
    hubName: hub.hubName,
    sessionDay: dayInViewerZone(interventionSession.sessionDate, timeZone),
    updatedDay: dayInViewerZone(interventionSession.updatedAt, timeZone),
    occurred: interventionSession.occurred,
    latestSessionType: max(interventionSession.sessionType),
  };
}

async function pastSessionsRequiringConfirmation(filters: MonitoringFilters) {
  const columns = schoolSessionColumns(filters.timeZone);
  const startOfToday = startOfTodayInViewerZone(filters.timeZone);
  return db
    .select(columns)
    .from(interventionSession)
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
        ne(school.schoolName, ""),
        eq(interventionSession.occurred, false),
        gte(interventionSession.sessionDate, sql`${startOfToday} - interval '100 days'`),
        lt(interventionSession.sessionDate, startOfToday),
        or(ne(interventionSession.status, "Cancelled"), isNull(interventionSession.status)),
      ),
    )
    .groupBy(
      columns.schoolName,
      columns.hubName,
      columns.sessionDay,
      columns.updatedDay,
      columns.occurred,
    )
    .orderBy(
      asc(columns.hubName),
      desc(columns.occurred),
      asc(columns.sessionDay),
      desc(columns.latestSessionType),
    );
}

async function upcomingSessions(filters: MonitoringFilters) {
  const columns = schoolSessionColumns(filters.timeZone);
  const startOfToday = startOfTodayInViewerZone(filters.timeZone);
  return db
    .select(columns)
    .from(interventionSession)
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
        ne(school.schoolName, ""),
        eq(interventionSession.occurred, false),
        gte(interventionSession.sessionDate, startOfToday),
        lt(interventionSession.sessionDate, sql`${startOfToday} + interval '101 days'`),
      ),
    )
    .groupBy(
      columns.schoolName,
      columns.hubName,
      columns.sessionDay,
      columns.updatedDay,
      columns.occurred,
    )
    .orderBy(desc(columns.occurred), asc(columns.sessionDay), desc(columns.latestSessionType));
}

async function concludedSessions(filters: MonitoringFilters) {
  const columns = schoolSessionColumns(filters.timeZone);
  return db
    .select(columns)
    .from(interventionSession)
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
        ne(school.schoolName, ""),
        eq(interventionSession.occurred, true),
      ),
    )
    .groupBy(
      columns.schoolName,
      columns.hubName,
      columns.sessionDay,
      columns.updatedDay,
      columns.occurred,
    )
    .orderBy(desc(columns.occurred), desc(columns.sessionDay), desc(columns.latestSessionType));
}

async function cancelledSessions(filters: MonitoringFilters) {
  const columns = {
    ...schoolSessionColumns(filters.timeZone),
    archivedMinute: minuteInViewerZone(interventionSession.archivedAt, filters.timeZone),
  };
  return db
    .select(columns)
    .from(interventionSession)
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        ne(school.schoolName, ""),
        eq(interventionSession.status, "Cancelled"),
      ),
    )
    .groupBy(
      columns.schoolName,
      columns.hubName,
      columns.sessionDay,
      columns.updatedDay,
      columns.occurred,
      columns.archivedMinute,
    )
    .orderBy(
      asc(columns.hubName),
      desc(columns.occurred),
      asc(columns.sessionDay),
      desc(columns.latestSessionType),
    );
}

const deliveryDescription =
  "Actual sessions are any session 1,2,3 or 4 where fellows have present attendance records.\nTarget sessions are all formed student groups times the 4 sessions that group is expected to have.\nThe percentage gap is 100* (target -actual) /target";

const deliveryColumns: TableColumn[] = [
  { key: "actualSessions", label: "Actual sessions" },
  { key: "targetSessions", label: "Target sessions" },
  { key: "gapPercent", label: "Gap (%)" },
];

const sessionIdentityColumns: TableColumn[] = [
  { key: "schoolName", label: "School Name" },
  { key: "hubName", label: "Hub Name" },
  { key: "sessionDay", label: "Session Date" },
  { key: "updatedDay", label: "Updated At" },
  { key: "occurred", label: "Occurred" },
];
const latestSessionTypeColumn: TableColumn = {
  key: "latestSessionType",
  label: "Max of Session Type",
};
const schoolSessionTableColumns = [...sessionIdentityColumns, latestSessionTypeColumn];

export const sessionsTab: MonitoringTab = {
  slug: "sessions",
  title: "Sessions",
  sections: [
    {
      heading: "Overview",
      cards: [
        {
          metabaseCardId: 4631,
          title: "Count of group sessions",
          width: 12,
          view: { kind: "scalar", value: "groupSessions" },
          load: groupSessionCount,
        },
        {
          metabaseCardId: 4692,
          title: "Sessions delivered vs. target",
          description: deliveryDescription,
          width: 12,
          view: { kind: "table", columns: deliveryColumns },
          load: deliveryVsTarget,
        },
        {
          metabaseCardId: 4706,
          title: "Count of group sessions per session",
          width: 24,
          view: {
            kind: "bar",
            x: "sessionType",
            xLabel: "Session Number",
            yLabel: "Number of group sessions",
            series: [{ key: "groupSessions", label: "Count" }],
          },
          load: groupSessionsPerSessionType,
        },
      ],
    },
    {
      heading: "Delivery vs target by hub and school",
      cards: [
        {
          metabaseCardId: 5186,
          title: "Sessions delivered vs. target by hubs",
          description: deliveryDescription,
          width: 24,
          view: {
            kind: "table",
            columns: [{ key: "hubName", label: "Hub Name" }, ...deliveryColumns],
          },
          load: deliveryVsTargetByHub,
        },
        {
          metabaseCardId: 5185,
          title: "Sessions delivered vs. target by hubs and schools",
          description: deliveryDescription,
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub Name" },
              { key: "schoolName", label: "School Name" },
              ...deliveryColumns,
            ],
          },
          load: deliveryVsTargetByHubAndSchool,
        },
      ],
    },
    {
      heading: "Session status",
      cards: [
        {
          metabaseCardId: 4680,
          title: "Past School Sessions Requiring Confirmation",
          width: 24,
          view: { kind: "table", columns: schoolSessionTableColumns },
          load: pastSessionsRequiringConfirmation,
        },
        {
          metabaseCardId: 4711,
          title: "Upcoming School Sessions",
          width: 24,
          view: { kind: "table", columns: schoolSessionTableColumns },
          load: upcomingSessions,
        },
        {
          metabaseCardId: 4704,
          title: "Concluded School Sessions",
          width: 24,
          view: { kind: "table", columns: schoolSessionTableColumns },
          load: concludedSessions,
        },
        {
          metabaseCardId: 4729,
          title: "Canceled Sessions",
          width: 24,
          view: {
            kind: "table",
            columns: [
              ...sessionIdentityColumns,
              { key: "archivedMinute", label: "Archived At" },
              latestSessionTypeColumn,
            ],
          },
          load: cancelledSessions,
        },
      ],
    },
  ],
};
