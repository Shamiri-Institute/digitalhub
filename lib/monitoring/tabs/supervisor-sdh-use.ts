import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  hub,
  interventionGroup,
  interventionSession,
  sessionName,
  supervisor,
} from "#/db/schema";
import { matchesIfSet, updatedAtAsMetabaseRead } from "#/lib/monitoring/sql";
import type { MonitoringCard, MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

async function fellowDataCompletenessByHub(filters: MonitoringFilters) {
  const percentComplete =
    sql<number>`avg(num_nonnulls(${fellow.fellowName}, ${fellow.fellowEmail}, ${fellow.mpesaName}, ${fellow.mpesaNumber}, ${fellow.idNumber}, ${fellow.cellNumber}, ${fellow.county}, ${fellow.subCounty}, ${fellow.dateOfBirth}, ${fellow.gender})::float / 10 * 100)`.mapWith(
      Number,
    );
  return db
    .select({ hubName: hub.hubName, percentComplete })
    .from(fellow)
    .leftJoin(hub, eq(fellow.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(fellow.supervisorId, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(percentComplete));
}

function percentMarkedByDeadline(deadlineDays: number) {
  const deadline = sql`${interventionSession.sessionDate} + make_interval(days => ${deadlineDays})`;
  const markedAt = updatedAtAsMetabaseRead(fellowAttendance.updatedAt);
  const markedInTime = sql`${markedAt} < ${deadline}`;
  const markedLate = sql`${markedAt} > ${deadline}`;
  return sql<number>`100 * (count(*) filter (where ${markedInTime}))::float / nullif(count(*) filter (where ${markedInTime} or ${markedLate}), 0)`.mapWith(
    Number,
  );
}

function markingScope(filters: MonitoringFilters) {
  return and(
    eq(hub.projectId, filters.projectId),
    eq(hub.id, filters.hubId),
    isNull(interventionGroup.archivedAt),
    matchesIfSet(interventionSession.schoolId, filters.schoolId),
    matchesIfSet(fellow.supervisorId, filters.supervisorId),
    matchesIfSet(fellowAttendance.fellowId, filters.fellowId),
  );
}

async function markingBySessionLabel(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      sessionLabel: sessionName.sessionLabel,
      percentTimely: percentMarkedByDeadline(20),
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(fellow, eq(fellowAttendance.fellowId, fellow.id))
    .leftJoin(interventionGroup, eq(fellowAttendance.groupId, interventionGroup.id))
    .leftJoin(sessionName, eq(interventionSession.sessionId, sessionName.id))
    .where(markingScope(filters))
    .groupBy(hub.hubName, sessionName.sessionLabel)
    .orderBy(asc(hub.hubName), asc(sessionName.sessionLabel));
}

async function markingByHub(filters: MonitoringFilters, deadlineDays: number) {
  const percentTimely = percentMarkedByDeadline(deadlineDays);
  return db
    .select({ hubName: hub.hubName, percentTimely })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(fellow, eq(fellowAttendance.fellowId, fellow.id))
    .leftJoin(interventionGroup, eq(fellowAttendance.groupId, interventionGroup.id))
    .where(markingScope(filters))
    .groupBy(hub.hubName)
    .orderBy(asc(percentTimely));
}

async function markingByHubAndSupervisor(filters: MonitoringFilters, deadlineDays: number) {
  const percentTimely = percentMarkedByDeadline(deadlineDays);
  return db
    .select({ hubName: hub.hubName, supervisorName: supervisor.supervisorName, percentTimely })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(fellow, eq(fellowAttendance.fellowId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(interventionGroup, eq(fellowAttendance.groupId, interventionGroup.id))
    .where(markingScope(filters))
    .groupBy(hub.hubName, supervisor.supervisorName)
    .orderBy(asc(hub.hubName), asc(percentTimely));
}

function hubMarkingCard(
  metabaseCardId: number,
  deadlineDays: number,
  dayWord: string,
): MonitoringCard {
  return {
    metabaseCardId,
    title: `Percentage timely fellow attendance marking, by Hubs (deadline ${deadlineDays} ${dayWord} after session)`,
    width: 12,
    view: {
      kind: "bar",
      x: "hubName",
      yLabel: "Timely fellow attendance marking (%)",
      series: [{ key: "percentTimely", label: "Percentage timely fellow attendance marking" }],
    },
    load: (filters) => markingByHub(filters, deadlineDays),
  };
}

function hubAndSupervisorMarkingCard(
  metabaseCardId: number,
  deadlineDays: number,
  dayWord: string,
): MonitoringCard {
  return {
    metabaseCardId,
    title: `Percentage timely fellow attendance marking, by Hubs and supervisors (deadline ${deadlineDays} ${dayWord} after session)`,
    width: 24,
    view: {
      kind: "bar",
      x: "supervisorName",
      yLabel: "Timely fellow attendance marking (%)",
      breakout: "hubName",
      value: "percentTimely",
    },
    load: (filters) => markingByHubAndSupervisor(filters, deadlineDays),
  };
}

export const supervisorSdhUseTab: MonitoringTab = {
  slug: "supervisor-sdh-use",
  title: "Supervisor SDH use",
  sections: [
    {
      heading: "Fellow data completeness",
      cards: [
        {
          metabaseCardId: 4691,
          title: "Fellow Data Completeness bar chart - by hubs",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            series: [{ key: "percentComplete", label: "Average" }],
          },
          load: fellowDataCompletenessByHub,
        },
        {
          metabaseCardId: 5003,
          title:
            "Percentage fellow attendance marking completed, by session type (deadline 20 days after session)",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub" },
              { key: "sessionLabel", label: "Session" },
              { key: "percentTimely", label: "Percentage timely fellow attendance marking" },
            ],
          },
          load: markingBySessionLabel,
        },
      ],
    },
    {
      heading: "Timely fellow attendance marking by hub",
      cards: [
        hubMarkingCard(4751, 1, "day"),
        hubMarkingCard(4638, 2, "days"),
        hubMarkingCard(4657, 5, "days"),
        hubMarkingCard(5004, 10, "days"),
      ],
    },
    {
      heading: "Timely fellow attendance marking by hub and supervisor",
      cards: [
        hubAndSupervisorMarkingCard(5130, 1, "day"),
        hubAndSupervisorMarkingCard(5131, 2, "days"),
        hubAndSupervisorMarkingCard(5132, 5, "days"),
        hubAndSupervisorMarkingCard(5133, 10, "days"),
      ],
    },
  ],
};
