import { and, asc, countDistinct, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  hub,
  interventionGroup,
  school,
  student,
} from "#/db/schema";
import { matchesIfSet } from "#/lib/monitoring/sql";
import type { MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

async function clinicalCasesByHub(filters: MonitoringFilters) {
  const cases = countDistinct(clinicalScreeningInfo.id);
  return db
    .select({ hubName: hub.hubName, cases })
    .from(clinicalScreeningInfo)
    .leftJoin(student, eq(clinicalScreeningInfo.studentId, student.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(interventionGroup.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(clinicalScreeningInfo.currentSupervisorId, filters.supervisorId),
        matchesIfSet(interventionGroup.leaderId, filters.fellowId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(cases));
}

async function clinicalSessionsByHub(filters: MonitoringFilters) {
  const clinicalSessions = countDistinct(clinicalSessionAttendance.id);
  const clinicalStudents = countDistinct(clinicalScreeningInfo.studentId);
  const sessionsPerStudent =
    sql<number>`count(distinct ${clinicalSessionAttendance.id})::float / nullif(count(distinct ${student.id}), 0)`.mapWith(
      Number,
    );
  return db
    .select({ hubName: hub.hubName, clinicalSessions, clinicalStudents, sessionsPerStudent })
    .from(clinicalSessionAttendance)
    .leftJoin(clinicalScreeningInfo, eq(clinicalSessionAttendance.caseId, clinicalScreeningInfo.id))
    .leftJoin(student, eq(clinicalScreeningInfo.studentId, student.id))
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(clinicalScreeningInfo.currentSupervisorId, filters.supervisorId),
        matchesIfSet(interventionGroup.leaderId, filters.fellowId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(hub.hubName));
}

export const clinicalWorkTab: MonitoringTab = {
  slug: "clinical-work",
  title: "Clinical work",
  sections: [
    {
      cards: [
        {
          metabaseCardId: 4758,
          title: "Clinical case count by hub",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            xLabel: "Hubs/Partners",
            yLabel: "cases",
            series: [{ key: "cases", label: "Cases" }],
          },
          load: clinicalCasesByHub,
        },
        {
          metabaseCardId: 4655,
          title: "Clinical Session count by hub",
          width: 12,
          view: { kind: "pie", name: "hubName", value: "clinicalSessions" },
          load: clinicalSessionsByHub,
        },
        {
          metabaseCardId: 4718,
          title: "Average number of clinical sessions per student by hub",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            xLabel: "Hubs/Partners",
            yLabel: "clinical sessions",
            series: [
              { key: "clinicalSessions", label: "Clinical sessions" },
              { key: "clinicalStudents", label: "Clinical students" },
              { key: "sessionsPerStudent", label: "Sessions per student" },
            ],
          },
          load: clinicalSessionsByHub,
        },
      ],
    },
  ],
};
