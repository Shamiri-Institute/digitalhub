import { and, asc, count, eq, isNotNull, notInArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  hub,
  interventionSession,
  school,
  supervisor,
} from "#/db/schema";
import { dayInViewerZone, matchesIfSet } from "#/lib/monitoring/sql";
import type { MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

const supervisorStatus = sql<string>`case when ${supervisor.droppedOut} is null then 'Active' else 'Dropped' end`;

const notInternalStaff = notInArray(supervisor.id, [
  "sup_01hz27tz89ewy9sjdz8m9ryzhc",
  "sup_01hz27tz89f08rarasd8hnq946",
  "sup_01hz27tz8afxgr6kszamf4jpjs",
  "sup_01hz27tz8cfdba236r2tt831g3",
  "sup_01hnanr086eq4as5y3b7ykkyhy",
  "sup_01hnanr085eb6b2tw7q9we62r0",
  "sup_01hnanr085fnqta4098ey2vcwx",
  "sup_01hgd1dk2kexkvka611fsnc4es",
]);

function supervisorProfileScope(filters: MonitoringFilters) {
  return and(
    notInternalStaff,
    eq(hub.projectId, filters.projectId),
    eq(hub.id, filters.hubId),
    matchesIfSet(supervisor.id, filters.supervisorId),
  );
}

async function activeVsDroppedSupervisors(filters: MonitoringFilters) {
  return db
    .select({ supervisorStatus, supervisors: count() })
    .from(supervisor)
    .innerJoin(hub, eq(supervisor.hubId, hub.id))
    .where(
      and(
        notInternalStaff,
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(supervisor.id, filters.supervisorId),
      ),
    )
    .groupBy(supervisorStatus)
    .orderBy(asc(supervisorStatus));
}

async function supervisorsActualVsTarget(filters: MonitoringFilters) {
  const actualSupervisors = sql`count(distinct ${supervisor.id}) filter (where ${supervisor.droppedOut} is null)`;
  const targetSupervisors = sql`count(distinct ${supervisor.id})`;
  return db
    .select({
      actualSupervisors: actualSupervisors.mapWith(Number),
      targetSupervisors: targetSupervisors.mapWith(Number),
      gapPercent:
        sql<number>`100 * (${targetSupervisors} - ${actualSupervisors})::float / nullif(${targetSupervisors}, 0)`.mapWith(
          Number,
        ),
    })
    .from(supervisor)
    .innerJoin(hub, eq(supervisor.hubId, hub.id))
    .where(and(notInternalStaff, eq(hub.projectId, filters.projectId), eq(hub.id, filters.hubId)));
}

async function supervisorsByHub(filters: MonitoringFilters) {
  const supervisors = count();
  return db
    .select({ hubName: hub.hubName, supervisors })
    .from(supervisor)
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .where(supervisorProfileScope(filters))
    .groupBy(hub.hubName)
    .orderBy(asc(supervisors));
}

async function supervisorsByGender(filters: MonitoringFilters) {
  return db
    .select({ gender: supervisor.gender, supervisors: count() })
    .from(supervisor)
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .where(supervisorProfileScope(filters))
    .groupBy(supervisor.gender)
    .orderBy(asc(supervisor.gender));
}

async function supervisorsBySubCounty(filters: MonitoringFilters) {
  return db
    .select({ subCounty: supervisor.subCounty, supervisors: count() })
    .from(supervisor)
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .where(supervisorProfileScope(filters))
    .groupBy(supervisor.subCounty)
    .orderBy(asc(supervisor.subCounty));
}

async function supervisorsByAge(filters: MonitoringFilters) {
  const age = sql<
    number | null
  >`extract(year from age(${supervisor.createdAt}, ${supervisor.dateOfBirth}))::int`;
  return db
    .select({ age, supervisors: count() })
    .from(supervisor)
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .where(supervisorProfileScope(filters))
    .groupBy(age)
    .orderBy(asc(age));
}

async function supervisorsList(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      supervisors: count(),
    })
    .from(supervisor)
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .where(and(notInternalStaff, eq(hub.projectId, filters.projectId), eq(hub.id, filters.hubId)))
    .groupBy(hub.hubName, supervisor.supervisorName)
    .orderBy(asc(hub.hubName), asc(supervisor.supervisorName));
}

async function processedAttendances(filters: MonitoringFilters) {
  const sessionDay = dayInViewerZone(fellowAttendance.sessionDate, filters.timeZone);
  const updatedDay = dayInViewerZone(fellowAttendance.updatedAt, filters.timeZone);
  const processedDay = dayInViewerZone(fellowAttendance.processedAt, filters.timeZone);
  return db
    .select({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      schoolName: school.schoolName,
      sessionType: interventionSession.sessionType,
      sessionDay,
      updatedDay,
      mpesaName: fellow.mpesaName,
      mpesaNumber: fellow.mpesaNumber,
      fellowDroppedOut: fellow.droppedOut,
      processedDay,
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
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        isNotNull(fellowAttendance.processedAt),
        eq(fellowAttendance.attended, true),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
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
      fellow.mpesaName,
      fellow.mpesaNumber,
      fellow.droppedOut,
      processedDay,
    )
    .orderBy(asc(hub.hubName));
}

export const supervisorsTab: MonitoringTab = {
  slug: "supervisors",
  title: "Supervisors",
  sections: [
    {
      heading: "Overview",
      cards: [
        {
          metabaseCardId: 4707,
          title: "Active vs. Dropped Supervisors",
          width: 12,
          view: {
            kind: "bar",
            x: "supervisorStatus",
            xLabel: "Has Supervisor Dropped Out",
            series: [{ key: "supervisors", label: "Count" }],
          },
          load: activeVsDroppedSupervisors,
        },
        {
          metabaseCardId: 4671,
          title: "Supervisors actual vs. target",
          description:
            "Actual supervisors are the number of supervisors still active by the end of implementation\nTarget supervisors are all supervisors uploaded at the start of implementation\nPercentage gap is 100*(target-actual)/target",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "actualSupervisors", label: "Actual supervisors" },
              { key: "targetSupervisors", label: "Target supervisors" },
              { key: "gapPercent", label: "Gap (%)" },
            ],
          },
          load: supervisorsActualVsTarget,
        },
      ],
    },
    {
      heading: "Supervisor profile",
      cards: [
        {
          metabaseCardId: 4705,
          title: "Supervisors By Hub",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            xLabel: "Hub Name",
            series: [{ key: "supervisors", label: "Supervisor Count" }],
          },
          load: supervisorsByHub,
        },
        {
          metabaseCardId: 4760,
          title: "Supervisors by gender",
          width: 12,
          view: { kind: "pie", name: "gender", value: "supervisors" },
          load: supervisorsByGender,
        },
        {
          metabaseCardId: 4746,
          title: "Supervisors grouped by sub county",
          width: 12,
          view: {
            kind: "bar",
            x: "subCounty",
            xLabel: "Sub County",
            series: [{ key: "supervisors", label: "Count" }],
          },
          load: supervisorsBySubCounty,
        },
        {
          metabaseCardId: 4716,
          title: "Supervisors grouped by age",
          width: 12,
          view: {
            kind: "bar",
            x: "age",
            xLabel: "Age",
            series: [{ key: "supervisors", label: "Count" }],
          },
          load: supervisorsByAge,
        },
      ],
    },
    {
      heading: "Details",
      cards: [
        {
          metabaseCardId: 4754,
          title: "Supervisors list",
          width: 24,
          view: {
            kind: "pivot",
            row: "supervisorName",
            rowLabel: "Supervisor",
            column: "hubName",
            value: "supervisors",
          },
          load: supervisorsList,
        },
        {
          metabaseCardId: 4666,
          title: "Processed attendances",
          width: 24,
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
              { key: "mpesaName", label: "M-Pesa name" },
              { key: "mpesaNumber", label: "M-Pesa number" },
              { key: "fellowDroppedOut", label: "Dropped out" },
              { key: "processedDay", label: "Processed at" },
              { key: "attendances", label: "Count" },
            ],
          },
          load: processedAttendances,
        },
      ],
    },
  ],
};
