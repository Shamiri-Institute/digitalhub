import "server-only";

import { eq, type SQL, type SQLWrapper, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  clinicalScreeningInfo,
  fellow,
  interventionGroup,
  interventionGroupReport,
  interventionSession,
  school,
  student,
  supervisor,
} from "#/db/schema";
import { countOf } from "#/db/sql";

// Shared reads behind the schedule and school sub-pages.

/** `extras` for a `student` relation: the number of clinical cases of each student. */
export const clinicalCasesCountExtras = (s: { id: typeof student.id }) => ({
  clinicalCasesCount: countOf(clinicalScreeningInfo.studentId, s.id).as("clinical_cases_count"),
});

/** Schools a session can be scheduled at. */
export function fetchScheduleSchools(hubId: string) {
  return db.query.school.findMany({
    where: (s, { eq }) => eq(s.hubId, hubId),
    columns: { id: true, schoolName: true },
    orderBy: (s, { asc }) => asc(s.schoolName),
  });
}

/** Session types a session can be scheduled with. */
export function fetchScheduleSessionTypes(hubId: string) {
  return db.query.sessionName.findMany({
    where: (s, { eq }) => eq(s.hubId, hubId),
    columns: { id: true, sessionType: true, sessionLabel: true },
  });
}

/**
 * Supervisors of the hubs with the fellow and group data the session dialogs read, and their
 * attendance at the sessions that `sessionsWhere` selects.
 */
export function fetchScheduleSupervisors(hubIds: string[] | SQLWrapper, sessionsWhere: SQL) {
  const sessionIds = db
    .select({ id: interventionSession.id })
    .from(interventionSession)
    .where(sessionsWhere);
  return db.query.supervisor.findMany({
    where: (s, { inArray }) => inArray(s.hubId, hubIds),
    columns: { id: true, hubId: true, supervisorName: true, cellNumber: true },
    with: {
      supervisorAttendances: {
        where: (a, { inArray }) => inArray(a.sessionId, sessionIds),
        columns: {
          id: true,
          sessionId: true,
          schoolId: true,
          attended: true,
          absenceReason: true,
          absenceComments: true,
        },
      },
      fellows: {
        columns: {
          id: true,
          supervisorId: true,
          fellowName: true,
          cellNumber: true,
          droppedOut: true,
        },
        with: {
          fellowAttendances: {
            where: (a, { inArray }) => inArray(a.sessionId, sessionIds),
            columns: {
              id: true,
              sessionId: true,
              schoolId: true,
              attended: true,
              processedAt: true,
            },
          },
          groups: {
            columns: { id: true, schoolId: true, groupName: true, groupType: true },
            extras: (g) => ({
              studentsCount: countOf(student.assignedGroupId, g.id).as("students_count"),
            }),
          },
        },
      },
      assignedSchools: { columns: { schoolName: true } },
    },
    orderBy: (s, { asc }) => asc(s.supervisorName),
  });
}

export type ScheduleSupervisor = Awaited<ReturnType<typeof fetchScheduleSupervisors>>[number];

/** Average weekly rating per fellow of a hub; NULL for fellows without ratings. */
export function fetchHubFellowRatings(hubId: string) {
  return db
    .execute<{ id: string; averageRating: number | null }>(sql`SELECT
    fel.id,
    ((AVG(wfr.behaviour_rating) + AVG(wfr.dressing_and_grooming_rating) + AVG(wfr.program_delivery_rating) + AVG(wfr.punctuality_rating)) / 4)::float8 AS "averageRating"
    FROM
    fellows fel
    LEFT JOIN weekly_fellow_ratings wfr ON fel.id = wfr.fellow_id
    WHERE fel.hub_id=${hubId}
    GROUP BY fel.id`)
    .then((r) => r.rows);
}

/** Groups of a school with their leader, supervisor and average report rating; add a `.where`. */
export function selectSchoolGroups() {
  const r = interventionGroupReport;
  return db
    .select({
      id: interventionGroup.id,
      groupName: interventionGroup.groupName,
      groupType: interventionGroup.groupType,
      leaderId: interventionGroup.leaderId,
      schoolId: interventionGroup.schoolId,
      projectId: interventionGroup.projectId,
      archivedAt: interventionGroup.archivedAt,
      fellowName: fellow.fellowName,
      supervisorName: supervisor.supervisorName,
      supervisorId: supervisor.id,
      groupRating: sql<
        number | null
      >`((avg(${r.engagement1}) + avg(${r.engagement2}) + avg(${r.engagement3}) + avg(${r.cooperation1}) + avg(${r.cooperation2}) + avg(${r.cooperation3}) + avg(${r.content})) / 7)::float8`,
    })
    .from(interventionGroup)
    .leftJoin(school, eq(interventionGroup.schoolId, school.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(interventionGroupReport, eq(interventionGroup.id, interventionGroupReport.groupId))
    .groupBy(
      interventionGroup.id,
      interventionGroup.projectId,
      fellow.fellowName,
      supervisor.supervisorName,
      supervisor.id,
    )
    .$dynamic();
}
