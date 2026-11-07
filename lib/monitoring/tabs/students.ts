import type { SQL, SQLWrapper } from "drizzle-orm";
import { and, asc, count, countDistinct, desc, eq, gte, isNull, ne, or, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  hub,
  interventionGroup,
  interventionSession,
  project,
  school,
  sessionName,
  student,
  studentAttendance,
  supervisor,
} from "#/db/schema";
import { matchesIfSet } from "#/lib/monitoring/sql";
import type { MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

function studentScope(filters: MonitoringFilters, ...cardConditions: (SQL | undefined)[]) {
  return and(
    eq(hub.projectId, filters.projectId),
    eq(hub.id, filters.hubId),
    matchesIfSet(school.id, filters.schoolId),
    matchesIfSet(fellow.supervisorId, filters.supervisorId),
    matchesIfSet(interventionGroup.leaderId, filters.fellowId),
    ...cardConditions,
  );
}

function attendanceScope(filters: MonitoringFilters, ...cardConditions: (SQL | undefined)[]) {
  return and(
    eq(interventionSession.projectId, filters.projectId),
    eq(hub.id, filters.hubId),
    matchesIfSet(school.id, filters.schoolId),
    ...cardConditions,
  );
}

function assignedSupervisorAndMarkingFellow(filters: MonitoringFilters) {
  return [
    matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
    matchesIfSet(studentAttendance.fellowId, filters.fellowId),
  ];
}

const rateOfMarkedAttendance =
  sql<number>`count(*) filter (where ${studentAttendance.attended})::float / nullif(count(${studentAttendance.attended}), 0)`.mapWith(
    Number,
  );

function sumAsInt(column: SQLWrapper) {
  return sql<number>`sum(${column})::int`.mapWith(Number);
}

async function signedUpStudents(filters: MonitoringFilters) {
  return db
    .select({ students: count() })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters, isNull(student.archivedAt)));
}

function signedUpPerSchool(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      projectName: project.name,
      numbersExpected: school.numbersExpected,
      students: countDistinct(student.id).as("students"),
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(project, eq(hub.projectId, project.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters, isNull(student.archivedAt)))
    .groupBy(hub.hubName, project.name, school.id, school.numbersExpected)
    .as("signed_up_per_school");
}

async function signedUpVersusExpectedOverall(filters: MonitoringFilters) {
  const perSchool = signedUpPerSchool({ ...filters, fellowId: null });
  const percentageGap =
    sql<number>`100 * (sum(${perSchool.numbersExpected}) - sum(${perSchool.students}))::float / nullif(sum(${perSchool.numbersExpected}), 0)`.mapWith(
      Number,
    );
  return db
    .select({
      projectName: perSchool.projectName,
      actual: sumAsInt(perSchool.students),
      expected: sumAsInt(perSchool.numbersExpected),
      percentageGap,
    })
    .from(perSchool)
    .groupBy(perSchool.projectName)
    .orderBy(asc(perSchool.projectName));
}

async function signedUpVersusExpectedByHub(filters: MonitoringFilters) {
  const perSchool = signedUpPerSchool(filters);
  return db
    .select({
      hubName: perSchool.hubName,
      actual: sumAsInt(perSchool.students),
      expected: sumAsInt(perSchool.numbersExpected),
    })
    .from(perSchool)
    .groupBy(perSchool.hubName)
    .orderBy(asc(perSchool.hubName));
}

async function expectedVersusActualBySchool(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      schoolName: school.schoolName,
      numbersExpected: school.numbersExpected,
      students: countDistinct(student.id),
      groups: countDistinct(interventionGroup.id),
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters))
    .groupBy(hub.hubName, school.schoolName, school.numbersExpected)
    .orderBy(asc(hub.hubName), asc(school.schoolName));
}

async function schoolsMoreThanFifthBelowExpected(filters: MonitoringFilters) {
  const participantGap =
    sql<number>`(${school.numbersExpected} - count(distinct ${student.id}))::float / nullif(${school.numbersExpected}, 0) * 100`.mapWith(
      Number,
    );
  return db
    .select({
      hubName: hub.hubName,
      schoolName: school.schoolName,
      numbersExpected: school.numbersExpected,
      students: countDistinct(student.id),
      participantGap,
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters, isNull(student.archivedAt)))
    .groupBy(hub.hubName, school.schoolName, school.numbersExpected)
    .having(sql`${participantGap} > 20`)
    .orderBy(desc(participantGap));
}

async function participantGapByHub(filters: MonitoringFilters) {
  const perSchool = db
    .select({
      hubName: hub.hubName,
      numbersExpected: school.numbersExpected,
      students: countDistinct(student.id).as("students"),
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters))
    .groupBy(hub.hubName, school.schoolName, school.numbersExpected)
    .as("signed_up_per_school");
  const participantGap =
    sql<number>`(sum(${perSchool.numbersExpected}) - sum(${perSchool.students}))::float / nullif(sum(${perSchool.numbersExpected}), 0) * 100`.mapWith(
      Number,
    );
  return db
    .select({
      hubName: perSchool.hubName,
      actual: sumAsInt(perSchool.students),
      expected: sumAsInt(perSchool.numbersExpected),
      participantGap,
    })
    .from(perSchool)
    .groupBy(perSchool.hubName)
    .orderBy(desc(participantGap));
}

async function attendanceMarksBySessionType(filters: MonitoringFilters) {
  const attendanceMark = sql<string>`case ${studentAttendance.attended} when true then 'attended' when false then 'absent' else 'unmarked' end`;
  return db
    .select({ sessionType: interventionSession.sessionType, attendanceMark, marks: count() })
    .from(studentAttendance)
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(fellow, eq(studentAttendance.fellowId, fellow.id))
    .where(
      attendanceScope(
        filters,
        matchesIfSet(fellow.supervisorId, filters.supervisorId),
        matchesIfSet(studentAttendance.fellowId, filters.fellowId),
      ),
    )
    .groupBy(interventionSession.sessionType, attendanceMark)
    .orderBy(asc(interventionSession.sessionType), asc(attendanceMark));
}

async function attendanceRatePerSession(filters: MonitoringFilters) {
  return db
    .select({
      sessionType: interventionSession.sessionType,
      attendanceRate: rateOfMarkedAttendance,
    })
    .from(studentAttendance)
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      attendanceScope(
        filters,
        or(ne(interventionSession.sessionType, "s0"), isNull(interventionSession.sessionType)),
      ),
    )
    .groupBy(interventionSession.sessionType)
    .orderBy(asc(interventionSession.sessionType), asc(rateOfMarkedAttendance));
}

async function attendanceRatePerSessionByHub(filters: MonitoringFilters) {
  return db
    .select({
      sessionType: interventionSession.sessionType,
      hubName: hub.hubName,
      attendanceRate: rateOfMarkedAttendance,
    })
    .from(studentAttendance)
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(attendanceScope(filters))
    .groupBy(interventionSession.sessionType, hub.hubName)
    .orderBy(asc(interventionSession.sessionType), asc(rateOfMarkedAttendance));
}

async function attendanceRateBySessionNameAndHub(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      sessionName: sessionName.sessionName,
      attendanceRate:
        sql<number>`count(*) filter (where ${studentAttendance.attended})::float / count(*)`.mapWith(
          Number,
        ),
    })
    .from(studentAttendance)
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(sessionName, eq(interventionSession.sessionId, sessionName.id))
    .where(attendanceScope(filters, ...assignedSupervisorAndMarkingFellow(filters)))
    .groupBy(sessionName.sessionName, hub.hubName)
    .orderBy(asc(sessionName.sessionName), asc(hub.hubName));
}

async function retentionPerSessionByHub(filters: MonitoringFilters) {
  const attendedSession = (sessionType: string) =>
    sql<boolean>`bool_or(${interventionSession.sessionType} = ${sql.raw(`'${sessionType}'`)} and ${studentAttendance.attended})`;
  const studentSessions = db.$with("student_sessions").as(
    db
      .select({
        studentId: studentAttendance.studentId,
        hubName: hub.hubName,
        s0: attendedSession("s0").as("s0"),
        s1: attendedSession("s1").as("s1"),
        s2: attendedSession("s2").as("s2"),
        s3: attendedSession("s3").as("s3"),
        s4: attendedSession("s4").as("s4"),
      })
      .from(studentAttendance)
      .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
      .leftJoin(school, eq(interventionSession.schoolId, school.id))
      .leftJoin(hub, eq(school.hubId, hub.id))
      .where(attendanceScope({ ...filters, schoolId: null }))
      .groupBy(studentAttendance.studentId, hub.hubName),
  );
  const { s0, s1, s2, s3, s4, hubName } = studentSessions;
  const retentionPercent = (attendedEarlier: SQL, attendedNext: SQLWrapper) =>
    sql<number>`round(100.0 * count(*) filter (where (${attendedEarlier}) and ${attendedNext}) / nullif(count(*) filter (where ${attendedEarlier}), 0), 2)`.mapWith(
      Number,
    );
  const isOverallRow = sql`grouping(${hubName}) = 1`;
  return db
    .with(studentSessions)
    .select({
      hubName: sql<string>`case when ${isOverallRow} then 'Overall' else ${hubName} end`,
      retentionS1: retentionPercent(sql`${s0}`, s1),
      retentionS2: retentionPercent(sql`${s0} or ${s1}`, s2),
      retentionS3: retentionPercent(sql`${s0} or ${s1} or ${s2}`, s3),
      retentionS4: retentionPercent(sql`${s0} or ${s1} or ${s2} or ${s3}`, s4),
    })
    .from(studentSessions)
    .groupBy(sql`rollup(${hubName})`)
    .orderBy(desc(isOverallRow), asc(hubName));
}

async function attendanceRateBySchool(filters: MonitoringFilters) {
  return db
    .select({
      schoolName: school.schoolName,
      hubName: hub.hubName,
      attendanceRate: rateOfMarkedAttendance,
    })
    .from(studentAttendance)
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(attendanceScope(filters, ...assignedSupervisorAndMarkingFellow(filters)))
    .groupBy(school.schoolName, hub.hubName)
    .orderBy(asc(hub.hubName), asc(rateOfMarkedAttendance));
}

async function studentsByGender(filters: MonitoringFilters) {
  return db
    .select({ gender: student.gender, students: count() })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters, isNull(student.archivedAt)))
    .groupBy(student.gender)
    .orderBy(asc(student.gender));
}

async function studentsByAge(filters: MonitoringFilters) {
  const age = sql<number>`2025 - ${student.yearOfBirth}`.mapWith(Number);
  return db
    .select({ age, students: count() })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters, isNull(student.archivedAt)))
    .groupBy(age)
    .orderBy(asc(age));
}

async function studentsByForm(filters: MonitoringFilters) {
  return db
    .select({ form: sql<string | null>`'Form ' || ${student.form}`, students: count() })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters, isNull(student.archivedAt)))
    .groupBy(student.form)
    .orderBy(asc(student.form));
}

async function studentsBySchoolCounty(filters: MonitoringFilters) {
  const students = count();
  return db
    .select({ schoolCounty: school.schoolCounty, students })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters))
    .groupBy(school.schoolCounty)
    .orderBy(desc(students));
}

async function studentsBySchoolType(filters: MonitoringFilters) {
  const students = count();
  return db
    .select({ schoolType: school.schoolType, students })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters))
    .groupBy(school.schoolType)
    .orderBy(desc(students));
}

async function signedUpBySupervisor(filters: MonitoringFilters) {
  const students = countDistinct(student.id);
  return db
    .select({ hubName: hub.hubName, supervisorName: supervisor.supervisorName, students })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .where(studentScope(filters))
    .groupBy(hub.hubName, supervisor.supervisorName)
    .orderBy(asc(hub.hubName), asc(students));
}

async function signedUpBySchool(filters: MonitoringFilters) {
  const students = countDistinct(student.id);
  return db
    .select({ hubName: hub.hubName, schoolName: school.schoolName, students })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters))
    .groupBy(hub.hubName, school.schoolName)
    .orderBy(asc(hub.hubName), asc(students));
}

async function groupSizeRangeBySchool(filters: MonitoringFilters) {
  const perGroup = db
    .select({
      hubName: hub.hubName,
      schoolName: school.schoolName,
      numbersExpected: school.numbersExpected,
      students: countDistinct(student.id).as("students"),
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters, isNull(student.archivedAt)))
    .groupBy(hub.hubName, school.schoolName, school.numbersExpected, interventionGroup.id)
    .as("students_per_group");
  const largestGroup = sql<number>`max(${perGroup.students})::int`.mapWith(Number);
  return db
    .select({
      hubName: perGroup.hubName,
      schoolName: perGroup.schoolName,
      numbersExpected: perGroup.numbersExpected,
      smallestGroup: sql<number>`min(${perGroup.students})::int`.mapWith(Number),
      largestGroup,
    })
    .from(perGroup)
    .groupBy(perGroup.hubName, perGroup.schoolName, perGroup.numbersExpected)
    .orderBy(desc(largestGroup));
}

async function schoolsWithSignedUpStudents(filters: MonitoringFilters) {
  const students = countDistinct(student.id);
  return db
    .select({ schoolName: school.schoolName, students })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(student, eq(school.id, student.schoolId))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
        matchesIfSet(interventionGroup.leaderId, filters.fellowId),
      ),
    )
    .groupBy(school.schoolName)
    .having(ne(students, 0))
    .orderBy(desc(students));
}

async function attendanceMissingnessBySchool(filters: MonitoringFilters) {
  const missingnessRate =
    sql<number>`count(*) filter (where ${studentAttendance.attended} is null)::float / count(*)`.mapWith(
      Number,
    );
  return db
    .select({ schoolName: school.schoolName, hubName: hub.hubName, missingnessRate })
    .from(studentAttendance)
    .leftJoin(interventionSession, eq(studentAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(attendanceScope(filters, ...assignedSupervisorAndMarkingFellow(filters)))
    .groupBy(school.schoolName, hub.hubName)
    .orderBy(asc(hub.hubName), desc(missingnessRate));
}

async function studentsAddedPerDay(filters: MonitoringFilters) {
  // Metabase buckets this card on the stored UTC day, not the viewer's.
  const day = sql<string>`to_char(${student.createdAt}, 'YYYY-MM-DD')`;
  return db
    .select({ day, students: count() })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(studentScope(filters, gte(student.createdAt, new Date("2026-01-28T00:00:00+03:00"))))
    .groupBy(day)
    .orderBy(asc(day));
}

export const studentsTab: MonitoringTab = {
  slug: "students",
  title: "Students",
  sections: [
    {
      heading: "Sign-ups vs target",
      cards: [
        {
          metabaseCardId: 4649,
          title: "Count of signed-up students",
          width: 12,
          view: { kind: "progress", value: "students", goal: 45000 },
          load: signedUpStudents,
        },
        {
          metabaseCardId: 4654,
          title: "Signed-up students actual vs expected",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "projectName", label: "Project" },
              { key: "actual", label: "Actual" },
              { key: "expected", label: "Expected" },
              { key: "percentageGap", label: "Percentage Gap" },
            ],
          },
          load: signedUpVersusExpectedOverall,
        },
        {
          metabaseCardId: 4753,
          title: "Count of signed-up students actual vs expected",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            yLabel: "Number of participants",
            series: [
              { key: "actual", label: "Actual" },
              { key: "expected", label: "Expected" },
            ],
          },
          load: signedUpVersusExpectedByHub,
        },
        {
          metabaseCardId: 4669,
          title: "Expected vs. Actual students signed up by schools",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub Name" },
              { key: "schoolName", label: "School Name" },
              { key: "numbersExpected", label: "Schools Numbers Expected" },
              { key: "students", label: "Actual signed up students" },
              { key: "groups", label: "Number of groups in the school" },
            ],
          },
          load: expectedVersusActualBySchool,
        },
        {
          metabaseCardId: 4646,
          title: "Expected vs. Uploaded students sign up by schools - percentage gap",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub Name" },
              { key: "schoolName", label: "School Name" },
              { key: "numbersExpected", label: "Schools Numbers Expected" },
              { key: "students", label: "Actual signed up students" },
              { key: "participantGap", label: "Participant gap (%)" },
            ],
          },
          load: schoolsMoreThanFifthBelowExpected,
        },
        {
          metabaseCardId: 4673,
          title: "Expected vs. Uploaded Participants gap by hubs",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            xLabel: "Hub",
            yLabel: "Expected vs Uploaded Participant gap (%)",
            series: [
              { key: "actual", label: "Actual: Participants who signed up" },
              { key: "expected", label: "Target: Numbers Expected from Schools" },
              {
                key: "participantGap",
                label: "Gap (%): Percentage of participants who did not sign up",
              },
            ],
          },
          load: participantGapByHub,
        },
      ],
    },
    {
      heading: "Attendance & retention",
      cards: [
        {
          metabaseCardId: 4682,
          title: "Student session attendance by session type",
          width: 12,
          view: {
            kind: "bar",
            x: "sessionType",
            breakout: "attendanceMark",
            value: "marks",
            stacked: true,
          },
          load: attendanceMarksBySessionType,
        },
        {
          metabaseCardId: 4696,
          title: "Student attendance rate per session",
          description:
            "Students marked present out of all marked attendance, per session. Excludes the pre-session.",
          width: 12,
          view: {
            kind: "bar",
            percent: true,
            goal: 0.9,
            x: "sessionType",
            xLabel: "Session",
            yLabel: "Attendance Rate",
            series: [{ key: "attendanceRate", label: "Attendance Rate" }],
          },
          load: attendanceRatePerSession,
        },
        {
          metabaseCardId: 4639,
          title: "Student attendance rate per session by hub",
          width: 24,
          view: {
            kind: "bar",
            percent: true,
            goal: 0.9,
            x: "sessionType",
            xLabel: "Session",
            yLabel: "Attendance Rate",
            breakout: "hubName",
            value: "attendanceRate",
          },
          load: attendanceRatePerSessionByHub,
        },
        {
          metabaseCardId: 4726,
          title: "Student attendance rate by session and hub",
          description:
            "Students marked present out of all attendance records. Unmarked records count as absent.",
          width: 24,
          view: {
            kind: "bar",
            percent: true,
            goal: 0.9,
            x: "hubName",
            xLabel: "Hub Name",
            yLabel: "Attendance Rate",
            breakout: "sessionName",
            value: "attendanceRate",
            ordered: true,
          },
          load: attendanceRateBySessionNameAndHub,
        },
        {
          metabaseCardId: 4675,
          title: "Student Retention rate per session by hub",
          description: `Each retention step measures how many students from the growing pool of previously engaged participants return for the next session.
Starts with students who attended Session 0, and checks how many of those same students attended Session 1.
Then expands the group to include anyone who attended Session 0 or Session 1, and checks how many of them attended Session 2.
Then continues the pattern by cumulatively including students who attended any previous sessions, and at each step measuring how many of them attend the next session.`,
          width: 24,
          view: {
            kind: "bar",
            goal: 90,
            x: "hubName",
            xLabel: "Hub",
            yLabel: "Retention Rate",
            ordered: true,
            series: [
              { key: "retentionS1", label: "S1 retention" },
              { key: "retentionS2", label: "S2 retention" },
              { key: "retentionS3", label: "S3 retention" },
              { key: "retentionS4", label: "S4 retention" },
            ],
          },
          load: retentionPerSessionByHub,
        },
        {
          metabaseCardId: 4744,
          title: "Student attendance rate by school",
          description: "Students marked present out of all marked attendance, per school.",
          width: 24,
          view: {
            kind: "bar",
            percent: true,
            goal: 0.9,
            x: "schoolName",
            xLabel: "School Name",
            yLabel: "Attendance Rate",
            breakout: "hubName",
            value: "attendanceRate",
          },
          load: attendanceRateBySchool,
        },
      ],
    },
    {
      heading: "Who we reached",
      cards: [
        {
          metabaseCardId: 4683,
          title: "Students reach by gender",
          width: 8,
          view: { kind: "pie", name: "gender", value: "students" },
          load: studentsByGender,
        },
        {
          metabaseCardId: 4737,
          title: "Students grouped by age",
          width: 8,
          view: { kind: "bar", x: "age", series: [{ key: "students", label: "Count" }] },
          load: studentsByAge,
        },
        {
          metabaseCardId: 4756,
          title: "Students grouped by form",
          width: 8,
          view: { kind: "pie", name: "form", value: "students" },
          load: studentsByForm,
        },
        {
          metabaseCardId: 4720,
          title: "Students reach by School county",
          width: 12,
          view: { kind: "bar", x: "schoolCounty", series: [{ key: "students", label: "Count" }] },
          load: studentsBySchoolCounty,
        },
        {
          metabaseCardId: 4650,
          title: "Students reach by School type",
          width: 12,
          view: { kind: "bar", x: "schoolType", series: [{ key: "students", label: "Count" }] },
          load: studentsBySchoolType,
        },
      ],
    },
    {
      heading: "Delivery breakdown",
      cards: [
        {
          metabaseCardId: 4750,
          title: "Count of signed-up students by supervisor",
          width: 24,
          view: { kind: "bar", x: "supervisorName", breakout: "hubName", value: "students" },
          load: signedUpBySupervisor,
        },
        {
          metabaseCardId: 4660,
          title: "Count of signed-up students by schools",
          width: 24,
          view: { kind: "bar", x: "schoolName", breakout: "hubName", value: "students" },
          load: signedUpBySchool,
        },
        {
          metabaseCardId: 4713,
          title: "Min and max students group size by schools",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub Name" },
              { key: "schoolName", label: "School Name" },
              { key: "numbersExpected", label: "Schools Numbers Expected" },
              { key: "smallestGroup", label: "Smallest group size" },
              { key: "largestGroup", label: "Largest group size" },
            ],
          },
          load: groupSizeRangeBySchool,
        },
        {
          metabaseCardId: 4698,
          title: "Schools by students distribution",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "schoolName", label: "School Name" },
              { key: "students", label: "Signed up students" },
            ],
          },
          load: schoolsWithSignedUpStudents,
        },
      ],
    },
    {
      heading: "Data quality",
      cards: [
        {
          metabaseCardId: 4634,
          title: "Student attendance data missingness by school",
          description:
            "Attendance records with no mark, out of all attendance records, per school.",
          width: 24,
          view: {
            kind: "bar",
            percent: true,
            goal: 1,
            x: "schoolName",
            xLabel: "School Name",
            yLabel: "Attendance Data Missingness Rate",
            breakout: "hubName",
            value: "missingnessRate",
          },
          load: attendanceMissingnessBySchool,
        },
        {
          metabaseCardId: 4636,
          title: "Number of students added by supervisors through the SDH",
          width: 24,
          onlyForProjectVisibleId: "2026_Project_2",
          view: { kind: "line", x: "day", series: [{ key: "students", label: "Count" }] },
          load: studentsAddedPerDay,
        },
      ],
    },
  ],
};
