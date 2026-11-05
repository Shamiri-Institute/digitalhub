import { and, asc, count, countDistinct, eq, isNull, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  hub,
  interventionGroup,
  interventionSession,
  school,
  sessionName,
  student,
  studentAttendance,
  supervisor,
} from "#/db/schema";
import { matchesIfSet, updatedAtAsMetabaseRead } from "#/lib/monitoring/sql";
import type { CardView, MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

async function studentDataCompletenessByHub(filters: MonitoringFilters) {
  const averageCompleteness =
    sql<number>`avg(num_nonnulls(${student.studentName}, ${student.admissionNumber}, ${student.form}, ${student.stream}, ${student.phoneNumber}, ${student.yearOfBirth})::float / 6 * 100)`.mapWith(
      Number,
    );
  return db
    .select({ hubName: hub.hubName, averageCompleteness })
    .from(student)
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        isNull(student.archivedAt),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(fellow.supervisorId, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(averageCompleteness));
}

function uploadsPerFellowAndSchoolTarget(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      studentsUploaded: countDistinct(student.id).as("students_uploaded"),
      groupCount: countDistinct(interventionGroup.id).as("group_count"),
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        isNull(student.archivedAt),
        isNull(interventionGroup.archivedAt),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(hub.hubName, school.numbersExpected, supervisor.supervisorName, fellow.fellowName)
    .as("uploads_per_fellow");
}

async function studentUploadsByFellow(filters: MonitoringFilters) {
  const uploads = uploadsPerFellowAndSchoolTarget(filters);
  const uploadPercent =
    sql<number>`sum(${uploads.studentsUploaded})::float / nullif(sum(${uploads.groupCount} * 15), 0) * 100`.mapWith(
      Number,
    );
  return db
    .select({
      hubName: uploads.hubName,
      supervisorName: uploads.supervisorName,
      fellowName: uploads.fellowName,
      participantsUploaded: sql<number>`sum(${uploads.studentsUploaded})::int`.mapWith(Number),
      expectedByGroups: sql<number>`sum(${uploads.groupCount} * 15)::int`.mapWith(Number),
      uploadPercent,
    })
    .from(uploads)
    .groupBy(uploads.hubName, uploads.supervisorName, uploads.fellowName)
    .orderBy(asc(uploads.hubName), asc(uploadPercent));
}

async function studentUploadsBySupervisor(filters: MonitoringFilters) {
  const uploads = uploadsPerFellowAndSchoolTarget(filters);
  const uploadPercent =
    sql<number>`sum(${uploads.studentsUploaded})::float / nullif(sum(${uploads.groupCount} * 15), 0) * 100`.mapWith(
      Number,
    );
  return db
    .select({
      hubName: uploads.hubName,
      supervisorName: uploads.supervisorName,
      participantsUploaded: sql<number>`sum(${uploads.studentsUploaded})::int`.mapWith(Number),
      expectedByGroups: sql<number>`sum(${uploads.groupCount} * 15)::int`.mapWith(Number),
      uploadPercent,
    })
    .from(uploads)
    .groupBy(uploads.hubName, uploads.supervisorName)
    .orderBy(asc(uploads.hubName), asc(uploadPercent));
}

const definedSessionsPerHub = db
  .select({
    hubId: sessionName.hubId,
    definedSessionCount: count().as("defined_session_count"),
  })
  .from(sessionName)
  .where(eq(sessionName.sessionType, "INTERVENTION"))
  .groupBy(sessionName.hubId)
  .as("defined_sessions_per_hub");

const studentCount = sql`count(distinct ${student.id})`;
const marksCount = sql`count(distinct ${studentAttendance.id})`;
const occurredSessionCount = sql`count(distinct ${sessionName.id})`;
const definedSessionCount = sql`max(${definedSessionsPerHub.definedSessionCount})`;
const percentCompleteAllSessions =
  sql<number>`100 * ${marksCount}::float / nullif(${studentCount} * ${definedSessionCount}, 0)`.mapWith(
    Number,
  );
const percentCompleteOccurredSessions =
  sql<number>`100 * ${marksCount}::float / nullif(${studentCount} * ${occurredSessionCount}, 0)`.mapWith(
    Number,
  );

function attendanceCompletenessPerSchoolFellow(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      percentCompleteAllSessions: percentCompleteAllSessions.as("percent_complete_all_sessions"),
      percentCompleteOccurredSessions: percentCompleteOccurredSessions.as(
        "percent_complete_occurred_sessions",
      ),
    })
    .from(student)
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(studentAttendance, eq(student.id, studentAttendance.studentId))
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(sessionName, eq(interventionSession.sessionId, sessionName.id))
    .leftJoin(definedSessionsPerHub, eq(hub.id, definedSessionsPerHub.hubId))
    .where(
      and(
        eq(interventionGroup.projectId, filters.projectId),
        eq(interventionSession.occurred, true),
        isNull(student.archivedAt),
        isNull(interventionGroup.archivedAt),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(fellow.fellowName, supervisor.supervisorName, school.schoolName, hub.hubName)
    .as("attendance_per_school_fellow");
}

async function attendanceCompletenessByHub(filters: MonitoringFilters) {
  const attendance = attendanceCompletenessPerSchoolFellow(filters);
  const averageAllSessions = sql<number>`avg(${attendance.percentCompleteAllSessions})`.mapWith(
    Number,
  );
  return db
    .select({
      hubName: attendance.hubName,
      averageOccurredSessions:
        sql<number>`avg(${attendance.percentCompleteOccurredSessions})`.mapWith(Number),
      averageAllSessions,
    })
    .from(attendance)
    .groupBy(attendance.hubName)
    .orderBy(sql`${averageAllSessions} desc nulls last`);
}

async function attendanceCompletenessBySupervisor(filters: MonitoringFilters) {
  const attendance = attendanceCompletenessPerSchoolFellow(filters);
  const averageAllSessions = sql<number>`avg(${attendance.percentCompleteAllSessions})`.mapWith(
    Number,
  );
  return db
    .select({
      hubName: attendance.hubName,
      supervisorName: attendance.supervisorName,
      averageOccurredSessions:
        sql<number>`avg(${attendance.percentCompleteOccurredSessions})`.mapWith(Number),
      averageAllSessions,
    })
    .from(attendance)
    .groupBy(attendance.hubName, attendance.supervisorName)
    .orderBy(sql`${averageAllSessions} desc nulls last`);
}

async function attendanceCompletenessByFellow(filters: MonitoringFilters) {
  const attendance = attendanceCompletenessPerSchoolFellow(filters);
  const averageAllSessions = sql<number>`avg(${attendance.percentCompleteAllSessions})`.mapWith(
    Number,
  );
  return db
    .select({
      hubName: attendance.hubName,
      supervisorName: attendance.supervisorName,
      fellowName: attendance.fellowName,
      averageOccurredSessions:
        sql<number>`avg(${attendance.percentCompleteOccurredSessions})`.mapWith(Number),
      averageAllSessions,
    })
    .from(attendance)
    .groupBy(attendance.hubName, attendance.supervisorName, attendance.fellowName)
    .orderBy(sql`${averageAllSessions} desc nulls last`);
}

async function attendanceCompletenessByGroup(filters: MonitoringFilters) {
  return db
    .select({
      percentCompleteOccurredSessions,
      groupName: interventionGroup.groupName,
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      schoolName: school.schoolName,
      studentCount: sql<number>`${studentCount}::int`.mapWith(Number),
      attendanceMarked: sql<number>`${marksCount}::int`.mapWith(Number),
      occurredSessionCount: sql<number>`${occurredSessionCount}::int`.mapWith(Number),
      expectedOccurredSessions:
        sql<number>`(${occurredSessionCount} * ${studentCount})::int`.mapWith(Number),
      expectedAllSessions: sql<number>`(${definedSessionCount} * ${studentCount})::int`.mapWith(
        Number,
      ),
      percentCompleteAllSessions,
    })
    .from(student)
    .leftJoin(studentAttendance, eq(student.id, studentAttendance.studentId))
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(sessionName, eq(interventionSession.sessionId, sessionName.id))
    .leftJoin(definedSessionsPerHub, eq(hub.id, definedSessionsPerHub.hubId))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(interventionSession.occurred, true),
        isNull(student.archivedAt),
        eq(hub.id, filters.hubId),
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
      interventionGroup.groupName,
    )
    .orderBy(asc(percentCompleteOccurredSessions));
}

async function timelyMarkingByHub(filters: MonitoringFilters, deadlineDays: number) {
  const deadline = sql`${interventionSession.sessionDate} + make_interval(days => ${deadlineDays})`;
  const markedAt = updatedAtAsMetabaseRead(studentAttendance.updatedAt);
  const timelyMarks = sql`sum(case when ${markedAt} < ${deadline} then 1 else 0 end)`;
  const lateMarks = sql`sum(case when ${markedAt} > ${deadline} then 1 else 0 end)`;
  const percentTimely =
    sql<number>`100 * ${timelyMarks}::float / nullif(${timelyMarks} + ${lateMarks}, 0)`.mapWith(
      Number,
    );
  return db
    .select({ hubName: hub.hubName, percentTimely })
    .from(studentAttendance)
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(interventionGroup, eq(studentAttendance.groupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(student, eq(studentAttendance.studentId, student.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        isNull(student.archivedAt),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(percentTimely));
}

const timelyMarkingView: CardView = {
  kind: "bar",
  x: "hubName",
  xLabel: "Hub",
  yLabel: "Timely student attendance marking (%)",
  series: [{ key: "percentTimely", label: "Percentage timely student attendance marking" }],
};

const fellowUploadColumns = [
  { key: "participantsUploaded", label: "Participants uploaded" },
  { key: "expectedByGroups", label: "Expected count by groups" },
  { key: "uploadPercent", label: "Student upload (%) estimate by group" },
  { key: "fellowName", label: "Fellow" },
  { key: "supervisorName", label: "Supervisor" },
  { key: "hubName", label: "Hub" },
];

const supervisorUploadColumns = fellowUploadColumns.filter(({ key }) => key !== "fellowName");

export const fellowSdhUseTab: MonitoringTab = {
  slug: "fellow-sdh-use",
  title: "Fellow SDH Use",
  sections: [
    {
      heading: "Student data completeness",
      cards: [
        {
          metabaseCardId: 4700,
          title: "Percentage completeness of student data (by columns filled in)",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            series: [{ key: "averageCompleteness", label: "Complete student data (%)" }],
          },
          load: studentDataCompletenessByHub,
        },
        {
          metabaseCardId: 4647,
          title: "Estimated completion of students upload by fellows (%) - graph",
          width: 24,
          view: {
            kind: "bar",
            goal: 80,
            x: "fellowName",
            xLabel: "Fellow",
            yLabel: "Student upload completion (%)",
            series: [{ key: "uploadPercent", label: "Student upload (%) estimate by group" }],
          },
          load: studentUploadsByFellow,
        },
        {
          metabaseCardId: 4739,
          title: "Estimated completion of students upload by fellows(%) - table",
          width: 24,
          view: { kind: "table", columns: fellowUploadColumns },
          load: studentUploadsByFellow,
        },
        {
          metabaseCardId: 4690,
          title: "Estimated completion of student uploads by supervisor (%) - graph",
          width: 24,
          view: {
            kind: "bar",
            goal: 80,
            x: "supervisorName",
            xLabel: "Supervisor",
            yLabel: "Estimated student upload completion (%)",
            series: [{ key: "uploadPercent", label: "Student upload (%) estimate by group" }],
          },
          load: studentUploadsBySupervisor,
        },
        {
          metabaseCardId: 4644,
          title: "Estimated completion of student uploads by supervisor (%) - table",
          width: 24,
          view: { kind: "table", columns: supervisorUploadColumns },
          load: studentUploadsBySupervisor,
        },
      ],
    },
    {
      heading: "Student attendance completeness",
      cards: [
        {
          metabaseCardId: 4740,
          title: "Percentage complete student attendance by hub",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            xLabel: "Hub",
            yLabel: "Complete attendance (%)",
            series: [
              {
                key: "averageOccurredSessions",
                label: "Percentage complete attendance (occurred sessions)",
              },
              {
                key: "averageAllSessions",
                label: "Percentage complete attendance (all sessions)",
              },
            ],
          },
          load: attendanceCompletenessByHub,
        },
        {
          metabaseCardId: 4701,
          title: "Percentage complete student attendance by supervisor and hub",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub" },
              { key: "supervisorName", label: "Supervisor" },
              {
                key: "averageOccurredSessions",
                label: "Percentage complete attendance (occurred sessions)",
              },
              {
                key: "averageAllSessions",
                label: "Percentage complete attendance (all sessions)",
              },
            ],
          },
          load: attendanceCompletenessBySupervisor,
        },
        {
          metabaseCardId: 4643,
          title: "Percentage complete student attendance by fellow, supervisor and hub",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub" },
              { key: "supervisorName", label: "Supervisor" },
              { key: "fellowName", label: "Fellows" },
              {
                key: "averageOccurredSessions",
                label: "Percentage complete attendance (occurred sessions)",
              },
              {
                key: "averageAllSessions",
                label: "Percentage complete attendance (all sessions)",
              },
            ],
          },
          load: attendanceCompletenessByFellow,
        },
        {
          metabaseCardId: 4648,
          title: "Percentage complete student attendance marking by group",
          width: 24,
          view: {
            kind: "table",
            columns: [
              {
                key: "percentCompleteOccurredSessions",
                label: "percentage complete attendance (occurred sessions)",
              },
              { key: "groupName", label: "Group Name" },
              { key: "hubName", label: "Hub" },
              { key: "supervisorName", label: "Supervisor" },
              { key: "fellowName", label: "Fellow" },
              { key: "schoolName", label: "School" },
              { key: "studentCount", label: "Students count" },
              { key: "attendanceMarked", label: "Attendance marked" },
              { key: "occurredSessionCount", label: "Occurred sessions count" },
              { key: "expectedOccurredSessions", label: "Expected attendance (occurred sessions)" },
              { key: "expectedAllSessions", label: "Expected attendance (all sessions)" },
              {
                key: "percentCompleteAllSessions",
                label: "percentage complete attendance (all sessions)",
              },
            ],
          },
          load: attendanceCompletenessByGroup,
        },
      ],
    },
    {
      heading: "Timely student attendance marking by hub",
      cards: [
        {
          metabaseCardId: 4749,
          title:
            "Percentage timely student attendance marking, by Hubs (deadline 1 day after session)",
          width: 12,
          view: timelyMarkingView,
          load: (filters) => timelyMarkingByHub(filters, 1),
        },
        {
          metabaseCardId: 4632,
          title:
            "Percentage timely student attendance marking, by Hubs (deadline 2 days after session)",
          width: 12,
          view: timelyMarkingView,
          load: (filters) => timelyMarkingByHub(filters, 2),
        },
        {
          metabaseCardId: 4743,
          title:
            "Percentage timely student attendance marking, by Hubs (deadline 5 days after session)",
          width: 12,
          view: timelyMarkingView,
          load: (filters) => timelyMarkingByHub(filters, 5),
        },
        {
          metabaseCardId: 4695,
          title:
            "Percentage timely student attendance marking, by Hubs (deadline 10 days after session)",
          width: 12,
          view: timelyMarkingView,
          load: (filters) => timelyMarkingByHub(filters, 10),
        },
      ],
    },
  ],
};
