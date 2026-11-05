import { and, asc, count, desc, eq, gt, gte, isNull, lt, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  hub,
  interventionSession,
  school,
  sessionName,
  supervisor,
  weeklyFellowRatings,
} from "#/db/schema";
import { dayInViewerZone, matchesIfSet } from "#/lib/monitoring/sql";
import type { MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

function fellowProfileScope(filters: MonitoringFilters) {
  return and(
    eq(hub.projectId, filters.projectId),
    eq(hub.id, filters.hubId),
    matchesIfSet(fellow.supervisorId, filters.supervisorId),
    matchesIfSet(fellow.id, filters.fellowId),
  );
}

async function activeVsDroppedFellows(filters: MonitoringFilters) {
  const fellowStatus = sql<string>`case when ${fellow.droppedOutAt} is null then 'Active' else 'Dropped' end`;
  return db
    .select({ fellowStatus, fellows: count() })
    .from(fellow)
    .innerJoin(hub, eq(fellow.hubId, hub.id))
    .where(fellowProfileScope(filters))
    .groupBy(fellowStatus)
    .orderBy(asc(fellowStatus));
}

async function fellowsActualVsTarget(filters: MonitoringFilters) {
  const actualFellows = sql`count(distinct ${fellow.id})`;
  const targetFellows = sql`count(distinct ${fellow.hubId}) * 90`;
  return db
    .select({
      actualFellows: actualFellows.mapWith(Number),
      targetFellows: targetFellows.mapWith(Number),
      gapPercent:
        sql<number>`100 * (${targetFellows} - ${actualFellows})::float / nullif(${targetFellows}, 0)`.mapWith(
          Number,
        ),
    })
    .from(fellow)
    .innerJoin(hub, eq(fellow.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        isNull(fellow.droppedOutAt),
      ),
    );
}

async function fellowsByHub(filters: MonitoringFilters) {
  return db
    .select({ hubName: hub.hubName, fellows: count() })
    .from(fellow)
    .innerJoin(hub, eq(fellow.hubId, hub.id))
    .where(fellowProfileScope(filters))
    .groupBy(hub.hubName)
    .orderBy(asc(hub.hubName));
}

async function fellowsBySubCounty(filters: MonitoringFilters) {
  const fellows = count();
  return db
    .select({ subCounty: fellow.subCounty, fellows })
    .from(fellow)
    .leftJoin(hub, eq(fellow.hubId, hub.id))
    .where(fellowProfileScope(filters))
    .groupBy(fellow.subCounty)
    .orderBy(desc(fellows));
}

async function fellowsBySupervisor(filters: MonitoringFilters) {
  const fellows = count();
  return db
    .select({ supervisorName: supervisor.supervisorName, hubName: hub.hubName, fellows })
    .from(fellow)
    .innerJoin(hub, eq(fellow.hubId, hub.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(supervisor.supervisorName, hub.hubName)
    .orderBy(asc(hub.hubName), asc(fellows));
}

async function fellowsByGender(filters: MonitoringFilters) {
  return db
    .select({ gender: fellow.gender, fellows: count() })
    .from(fellow)
    .leftJoin(hub, eq(fellow.hubId, hub.id))
    .where(fellowProfileScope(filters))
    .groupBy(fellow.gender)
    .orderBy(asc(fellow.gender));
}

async function fellowsByAge(filters: MonitoringFilters) {
  const age = sql<
    number | null
  >`extract(year from age(${fellow.createdAt}, ${fellow.dateOfBirth}))::int`;
  return db
    .select({ age, fellows: count() })
    .from(fellow)
    .leftJoin(hub, eq(fellow.hubId, hub.id))
    .where(fellowProfileScope(filters))
    .groupBy(age)
    .orderBy(asc(age));
}

async function fellowDropoutOverTime(filters: MonitoringFilters) {
  const droppedOutDay = dayInViewerZone(fellow.droppedOutAt, filters.timeZone);
  return db
    .select({ droppedOutDay, fellows: count() })
    .from(fellow)
    .innerJoin(hub, eq(fellow.hubId, hub.id))
    .where(fellowProfileScope(filters))
    .groupBy(droppedOutDay)
    .orderBy(asc(droppedOutDay));
}

async function fellowDropoutByHub(filters: MonitoringFilters) {
  return db
    .select({ hubName: hub.hubName, fellows: count() })
    .from(fellow)
    .innerJoin(hub, eq(fellow.hubId, hub.id))
    .where(and(eq(fellow.droppedOut, true), fellowProfileScope(filters)))
    .groupBy(hub.hubName)
    .orderBy(asc(hub.hubName));
}

async function fellowDropoutReasons(filters: MonitoringFilters) {
  return db
    .select({ dropOutReason: fellow.dropOutReason, fellows: count() })
    .from(fellow)
    .innerJoin(hub, eq(fellow.hubId, hub.id))
    .where(and(eq(fellow.droppedOut, true), fellowProfileScope(filters)))
    .groupBy(fellow.dropOutReason)
    .orderBy(asc(fellow.dropOutReason));
}

async function fellowAttendanceStatusBySession(filters: MonitoringFilters) {
  const attendanceStatus = sql<string>`case ${fellowAttendance.attended} when true then 'Attended' when false then 'Absent' else 'Unmarked' end`;
  return db
    .select({
      sessionType: interventionSession.sessionType,
      attendanceStatus,
      attendances: count(),
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        gt(fellowAttendance.createdAt, new Date("2024-01-28T00:00:00+03:00")),
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(fellowAttendance.supervisorId, filters.supervisorId),
        matchesIfSet(fellowAttendance.fellowId, filters.fellowId),
      ),
    )
    .groupBy(attendanceStatus, interventionSession.sessionType)
    .orderBy(asc(interventionSession.sessionType), asc(attendanceStatus));
}

async function fellowAttendanceLog(filters: MonitoringFilters) {
  return db
    .select({
      attended: fellowAttendance.attended,
      sessionName: sessionName.sessionName,
      supervisorName: supervisor.supervisorName,
      schoolName: school.schoolName,
      venue: interventionSession.venue,
      sessionType: sessionName.sessionType,
      attendances: count(),
      hubName: hub.hubName,
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(fellow, eq(fellowAttendance.fellowId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(sessionName, eq(interventionSession.sessionId, sessionName.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(
      fellowAttendance.attended,
      supervisor.supervisorName,
      school.schoolName,
      interventionSession.venue,
      sessionName.sessionType,
      sessionName.sessionName,
      hub.hubName,
    )
    .orderBy(asc(hub.hubName), asc(supervisor.supervisorName), asc(sessionName.sessionName));
}

async function programDeliveryRatingByHub(filters: MonitoringFilters) {
  const weekStart = sql<string>`to_char(date_trunc('week', ${weeklyFellowRatings.week}::timestamp), 'YYYY-MM-DD')`;
  return db
    .select({
      weekStart,
      hubName: hub.hubName,
      averageRating: sql<number>`avg(${weeklyFellowRatings.programDeliveryRating})::float`.mapWith(
        Number,
      ),
    })
    .from(weeklyFellowRatings)
    .leftJoin(fellow, eq(weeklyFellowRatings.fellowId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(supervisor.id, filters.supervisorId),
      ),
    )
    .groupBy(hub.hubName, weekStart)
    .orderBy(asc(weekStart), asc(hub.hubName));
}

async function fellowDataCompleteness(filters: MonitoringFilters) {
  const completenessColumns = [
    fellow.fellowName,
    fellow.fellowEmail,
    fellow.mpesaName,
    fellow.mpesaNumber,
    fellow.idNumber,
    fellow.cellNumber,
    fellow.county,
    fellow.subCounty,
    fellow.dateOfBirth,
    fellow.gender,
  ];
  const missingColumns = sql.join(
    completenessColumns.map((column) => sql`(${column} is null)::int`),
    sql` + `,
  );
  const completenessPercent =
    sql<number>`avg((10 - (${missingColumns}))::float / 10 * 100)::float`.mapWith(Number);
  return db
    .select({ fellowName: fellow.fellowName, completenessPercent })
    .from(fellow)
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(fellow.fellowName)
    .orderBy(asc(completenessPercent));
}

async function unpaidAttendancesBefore26May(filters: MonitoringFilters) {
  const sessionDay = dayInViewerZone(fellowAttendance.sessionDate, filters.timeZone);
  const updatedDay = dayInViewerZone(fellowAttendance.updatedAt, filters.timeZone);
  return db
    .select({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      schoolName: school.schoolName,
      venue: interventionSession.venue,
      sessionName: sessionName.sessionName,
      sessionDay,
      updatedDay,
      mpesaName: fellow.mpesaName,
      mpesaNumber: fellow.mpesaNumber,
      attendanceSupervisorId: fellowAttendance.supervisorId,
      fellowId: fellow.id,
      fellowDroppedOut: fellow.droppedOut,
      attendances: count(),
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(fellow, eq(fellowAttendance.fellowId, fellow.id))
    .leftJoin(
      supervisor,
      eq(supervisor.id, sql`coalesce(${fellowAttendance.supervisorId}, ${fellow.supervisorId})`),
    )
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(sessionName, eq(interventionSession.sessionId, sessionName.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        lt(fellowAttendance.updatedAt, new Date("2026-05-26T00:00:00+03:00")),
        isNull(fellowAttendance.processedAt),
        eq(fellowAttendance.attended, true),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(
      hub.hubName,
      supervisor.supervisorName,
      fellow.fellowName,
      school.schoolName,
      interventionSession.venue,
      sessionName.sessionName,
      sessionDay,
      updatedDay,
      fellow.mpesaName,
      fellow.mpesaNumber,
      fellowAttendance.supervisorId,
      fellow.id,
      fellow.droppedOut,
    )
    .orderBy(asc(hub.hubName));
}

async function unpaidAttendancesAfter26May(filters: MonitoringFilters) {
  const sessionDay = dayInViewerZone(fellowAttendance.sessionDate, filters.timeZone);
  const updatedDay = dayInViewerZone(fellowAttendance.updatedAt, filters.timeZone);
  return db
    .select({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      schoolName: school.schoolName,
      sessionType: interventionSession.sessionType,
      sessionDay,
      updatedDay,
      fellowDroppedOut: fellow.droppedOut,
      mpesaNumber: fellow.mpesaNumber,
      fellowId: fellow.id,
      supervisorId: supervisor.id,
      attendanceId: fellowAttendance.id,
      attendances: count(),
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(fellow, eq(fellowAttendance.fellowId, fellow.id))
    .leftJoin(supervisor, eq(fellowAttendance.supervisorId, supervisor.id))
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        gte(fellowAttendance.updatedAt, new Date("2026-05-26T11:01:00+03:00")),
        isNull(fellowAttendance.processedAt),
        eq(fellowAttendance.attended, true),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(
      hub.hubName,
      supervisor.supervisorName,
      fellow.fellowName,
      school.schoolName,
      interventionSession.sessionType,
      sessionDay,
      updatedDay,
      fellow.droppedOut,
      fellow.mpesaNumber,
      fellow.id,
      supervisor.id,
      fellowAttendance.id,
    )
    .orderBy(asc(hub.hubName));
}

export const fellowsTab: MonitoringTab = {
  slug: "fellows",
  title: "Fellows",
  sections: [
    {
      heading: "Overview",
      cards: [
        {
          metabaseCardId: 4734,
          title: "Active vs Dropped Fellows",
          width: 12,
          view: {
            kind: "bar",
            x: "fellowStatus",
            xLabel: "Has Fellow Dropped Out",
            series: [{ key: "fellows", label: "Count" }],
          },
          load: activeVsDroppedFellows,
        },
        {
          metabaseCardId: 4745,
          title: "Fellows actual vs. target",
          description:
            "Actual fellows are the number of fellows still active by the end of implementation.\nTarget fellows are number of hubs times 90 as each hub was supposed to have 90 fellows",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "actualFellows", label: "Actual fellows" },
              { key: "targetFellows", label: "Target fellows" },
              { key: "gapPercent", label: "Gap (%)" },
            ],
          },
          load: fellowsActualVsTarget,
        },
        {
          metabaseCardId: 4653,
          title: "Fellows By Hubs",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            xLabel: "Hub",
            series: [{ key: "fellows", label: "Count" }],
          },
          load: fellowsByHub,
        },
        {
          metabaseCardId: 4689,
          title: "Fellows grouped by sub county",
          width: 12,
          view: {
            kind: "bar",
            x: "subCounty",
            xLabel: "Sub County",
            series: [{ key: "fellows", label: "Count" }],
          },
          load: fellowsBySubCounty,
        },
        {
          metabaseCardId: 4725,
          title: "Fellows By Supervisor",
          width: 24,
          view: {
            kind: "bar",
            x: "supervisorName",
            xLabel: "Supervisor",
            breakout: "hubName",
            value: "fellows",
          },
          load: fellowsBySupervisor,
        },
      ],
    },
    {
      heading: "Fellow profile",
      cards: [
        {
          metabaseCardId: 4640,
          title: "Fellows grouped by gender",
          width: 12,
          view: { kind: "pie", name: "gender", value: "fellows" },
          load: fellowsByGender,
        },
        {
          metabaseCardId: 4658,
          title: "Fellows grouped by age",
          width: 12,
          view: {
            kind: "bar",
            x: "age",
            xLabel: "Age",
            series: [{ key: "fellows", label: "Count" }],
          },
          load: fellowsByAge,
        },
      ],
    },
    {
      heading: "Dropouts",
      cards: [
        {
          metabaseCardId: 4755,
          title: "Fellow drop out over time",
          width: 24,
          view: {
            kind: "bar",
            x: "droppedOutDay",
            xLabel: "Has Fellow Dropped Out",
            series: [{ key: "fellows", label: "Count" }],
          },
          load: fellowDropoutOverTime,
        },
        {
          metabaseCardId: 4703,
          title: "Fellow Dropout Grouped By Hub",
          width: 12,
          view: { kind: "pie", name: "hubName", value: "fellows" },
          load: fellowDropoutByHub,
        },
        {
          metabaseCardId: 4684,
          title: "Fellow drop out reasons",
          width: 12,
          view: { kind: "pie", name: "dropOutReason", value: "fellows" },
          load: fellowDropoutReasons,
        },
      ],
    },
    {
      heading: "Attendance and delivery",
      cards: [
        {
          metabaseCardId: 4681,
          title: "Fellow attendance status by session",
          width: 24,
          view: {
            kind: "bar",
            x: "sessionType",
            breakout: "attendanceStatus",
            value: "attendances",
            stacked: true,
          },
          load: fellowAttendanceStatusBySession,
        },
        {
          metabaseCardId: 4697,
          title: "Fellow attendance log",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "attended", label: "Attended" },
              { key: "sessionName", label: "Session" },
              { key: "supervisorName", label: "Supervisor Name" },
              { key: "schoolName", label: "School Name" },
              { key: "venue", label: "Training/Supervision Venue" },
              { key: "sessionType", label: "SessionType" },
              { key: "attendances", label: "Fellow attendance count" },
              { key: "hubName", label: "Hub Name" },
            ],
          },
          load: fellowAttendanceLog,
        },
        {
          metabaseCardId: 4702,
          title: "Average of Program Delivery Rating by Hubs",
          width: 24,
          view: { kind: "line", x: "weekStart", breakout: "hubName", value: "averageRating" },
          load: programDeliveryRatingByHub,
        },
      ],
    },
    {
      heading: "Data quality and payments",
      cards: [
        {
          metabaseCardId: 4731,
          title: "Fellow Data Completeness bar chart",
          width: 24,
          view: {
            kind: "bar",
            x: "fellowName",
            series: [{ key: "completenessPercent", label: "Data completeness (%)" }],
          },
          load: fellowDataCompleteness,
        },
        {
          metabaseCardId: 4748,
          title: "Unpaid past attendances before 26th May",
          width: 24,
          onlyForProjectVisibleId: "2026_Project_2",
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub" },
              { key: "supervisorName", label: "Supervisor" },
              { key: "fellowName", label: "Fellow" },
              { key: "schoolName", label: "School" },
              { key: "venue", label: "Venue" },
              { key: "sessionName", label: "Session" },
              { key: "sessionDay", label: "Session date" },
              { key: "updatedDay", label: "Updated at" },
              { key: "mpesaName", label: "M-Pesa name" },
              { key: "mpesaNumber", label: "M-Pesa number" },
              { key: "attendanceSupervisorId", label: "Supervisor ID" },
              { key: "fellowId", label: "Fellow ID" },
              { key: "fellowDroppedOut", label: "Dropped out" },
              { key: "attendances", label: "Count" },
            ],
          },
          load: unpaidAttendancesBefore26May,
        },
        {
          metabaseCardId: 4717,
          title: "Unpaid past attendances after 11am 26th May",
          width: 24,
          onlyForProjectVisibleId: "2026_Project_2",
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub" },
              { key: "supervisorName", label: "Supervisor" },
              { key: "fellowName", label: "Fellow" },
              { key: "schoolName", label: "School" },
              { key: "sessionType", label: "Session type" },
              { key: "sessionDay", label: "Session date" },
              { key: "updatedDay", label: "Updated at" },
              { key: "fellowDroppedOut", label: "Dropped out" },
              { key: "mpesaNumber", label: "M-Pesa number" },
              { key: "fellowId", label: "Fellow ID" },
              { key: "supervisorId", label: "Supervisor ID" },
              { key: "attendanceId", label: "Attendance ID" },
              { key: "attendances", label: "Count" },
            ],
          },
          load: unpaidAttendancesAfter26May,
        },
      ],
    },
  ],
};
