import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  fellowAttendance,
  hub,
  interventionGroup,
  interventionSession,
  school,
  sessionName,
  sessionRecording,
  student,
  supervisor,
} from "#/db/schema";
import { dayInViewerZone, matchesIfSet } from "#/lib/monitoring/sql";
import type { MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

const interventionSessionNames = ["s1", "s2", "s3", "s4"];

function groupsWithMissingStudents(filters: MonitoringFilters) {
  const processedDay = dayInViewerZone(fellowAttendance.processedAt, filters.timeZone);
  const uploadedStudents = countDistinct(student.id);
  return db
    .select({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      sessionName: sessionName.sessionName,
      schoolName: school.schoolName,
      fellowName: fellow.fellowName,
      attended: fellowAttendance.attended,
      processedDay: processedDay.as("processed_day"),
      groupName: interventionGroup.groupName,
      uploadedStudents: uploadedStudents.as("uploaded_students"),
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(fellow, eq(fellowAttendance.fellowId, fellow.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(sessionName, eq(interventionSession.sessionId, sessionName.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(hub, eq(fellow.hubId, hub.id))
    .leftJoin(interventionGroup, eq(fellowAttendance.groupId, interventionGroup.id))
    .leftJoin(student, eq(interventionGroup.id, student.assignedGroupId))
    .where(
      and(
        eq(fellowAttendance.attended, true),
        inArray(sessionName.sessionName, interventionSessionNames),
        eq(interventionSession.projectId, filters.projectId),
        isNotNull(fellowAttendance.processedAt),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(
      supervisor.supervisorName,
      sessionName.sessionName,
      school.schoolName,
      fellow.fellowName,
      fellowAttendance.attended,
      processedDay,
      interventionGroup.groupName,
      hub.hubName,
    )
    .having(lt(uploadedStudents, 5));
}

async function missingStudentUploads(filters: MonitoringFilters) {
  return groupsWithMissingStudents(filters).orderBy(
    sql`"hub_name"`,
    sql`"school_name"`,
    sql`"supervisor_name"`,
    sql`"fellow_name"`,
    sql`"uploaded_students"`,
  );
}

async function missingStudentUploadsByHub(filters: MonitoringFilters) {
  const missing = groupsWithMissingStudents(filters).as("groups_with_missing_students");
  const groupsWithMissing = countDistinct(missing.groupName);
  return db
    .select({ hubName: missing.hubName, groupsWithMissing })
    .from(missing)
    .groupBy(missing.hubName)
    .orderBy(asc(groupsWithMissing), asc(missing.hubName));
}

function groupSizeStats(
  studentCount: SQL.Aliased,
  smallestInRange: number,
  largestInRange: number,
) {
  const allGroups = sql`count(*)`;
  const groupsAboveRange = sql`count(*) filter (where ${studentCount} > ${largestInRange})`;
  const groupsBelowRange = sql`count(*) filter (where ${studentCount} < ${smallestInRange})`;
  const groupsInRange = sql`(${allGroups} - ${groupsBelowRange} - ${groupsAboveRange})`;
  return {
    allGroups: sql<number>`${allGroups}::int`.mapWith(Number),
    groupsInRange: sql<number>`${groupsInRange}::int`.mapWith(Number),
    groupsAboveRange: sql<number>`${groupsAboveRange}::int`.mapWith(Number),
    groupsBelowRange: sql<number>`${groupsBelowRange}::int`.mapWith(Number),
    percentInRange: sql<number>`100 * ${groupsInRange}::float / nullif(${allGroups}, 0)`.mapWith(
      Number,
    ),
    percentAboveRange:
      sql<number>`100 * ${groupsAboveRange}::float / nullif(${allGroups}, 0)`.mapWith(Number),
    percentBelowRange:
      sql<number>`100 * ${groupsBelowRange}::float / nullif(${allGroups}, 0)`.mapWith(Number),
    smallestGroup: sql<number>`min(${studentCount})`.mapWith(Number),
    largestGroup: sql<number>`max(${studentCount})`.mapWith(Number),
  };
}

function groupSizes(filters: MonitoringFilters, wiredFilters?: SQL) {
  return db
    .select({
      hubName: hub.hubName,
      studentCount: countDistinct(student.id).as("student_count"),
    })
    .from(interventionGroup)
    .leftJoin(school, eq(interventionGroup.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .innerJoin(student, eq(interventionGroup.id, student.assignedGroupId))
    .where(and(eq(hub.projectId, filters.projectId), eq(hub.id, filters.hubId), wiredFilters))
    .groupBy(interventionGroup.id, hub.hubName)
    .as("group_sizes");
}

async function correctGroupSizeOverall(filters: MonitoringFilters) {
  const sizes = groupSizes(
    filters,
    and(
      matchesIfSet(school.id, filters.schoolId),
      matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
      matchesIfSet(interventionGroup.leaderId, filters.fellowId),
    ),
  );
  return db.select(groupSizeStats(sizes.studentCount, 10, 15)).from(sizes);
}

async function correctGroupSizeByHub(filters: MonitoringFilters) {
  const sizes = groupSizes(filters);
  return db
    .select({ hubName: sizes.hubName, ...groupSizeStats(sizes.studentCount, 10, 15) })
    .from(sizes)
    .groupBy(sizes.hubName);
}

const thikaAbTestSchools = [
  "Mangu High School",
  "Kairi Boys",
  "Mary Immaculate Secondary School",
  "Kimuchu Secondary School",
  "Thika Garrison Secondary School",
  "Makwa Secondary School",
];

const thikaAbControlSchools = [
  "Thika Boys High",
  "St. Francis Mangu Girls",
  "Karibaribi Secondary School",
  "Mwea Secondary",
  "Makwa Boys School",
  "Igegania Secondary School",
  "Jamhuri Secondary",
];

function thikaAbGroupSizes(filters: MonitoringFilters, wiredFilters?: SQL) {
  const abCondition = sql<string>`case
    when ${inArray(school.schoolName, thikaAbTestSchools)} then 'test'
    when ${inArray(school.schoolName, thikaAbControlSchools)} then 'control'
    else 'usual' end`.as("ab_condition");
  return db
    .select({
      abCondition,
      schoolName: school.schoolName,
      studentCount: countDistinct(student.id).as("student_count"),
    })
    .from(interventionGroup)
    .leftJoin(school, eq(interventionGroup.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .innerJoin(student, eq(interventionGroup.id, student.assignedGroupId))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        isNull(interventionGroup.archivedAt),
        eq(hub.hubName, "Thika Hub"),
        eq(hub.id, filters.hubId),
        wiredFilters,
      ),
    )
    .groupBy(interventionGroup.id, abCondition, school.schoolName)
    .as("thika_ab_group_sizes");
}

async function thikaAbGroupSizeByCondition(filters: MonitoringFilters) {
  const sizes = thikaAbGroupSizes(
    filters,
    and(
      matchesIfSet(school.id, filters.schoolId),
      matchesIfSet(fellow.supervisorId, filters.supervisorId),
      matchesIfSet(interventionGroup.leaderId, filters.fellowId),
    ),
  );
  return db
    .select({ abCondition: sizes.abCondition, ...groupSizeStats(sizes.studentCount, 16, 17) })
    .from(sizes)
    .groupBy(sizes.abCondition);
}

async function thikaAbGroupSizeBySchool(filters: MonitoringFilters) {
  const sizes = thikaAbGroupSizes(filters);
  return db
    .select({
      schoolName: sizes.schoolName,
      abCondition: sizes.abCondition,
      ...groupSizeStats(sizes.studentCount, 16, 17),
    })
    .from(sizes)
    .groupBy(sizes.abCondition, sizes.schoolName);
}

async function duplicateAdmissionCounts(filters: MonitoringFilters) {
  const duplicateCount = countDistinct(student.id);
  return db
    .select({
      schoolName: school.schoolName,
      admissionNumber: student.admissionNumber,
      hubName: hub.hubName,
      duplicateCount,
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
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
    .groupBy(school.schoolName, student.admissionNumber, hub.hubName)
    .having(gt(duplicateCount, 1))
    .orderBy(asc(hub.hubName), asc(school.schoolName), desc(duplicateCount));
}

async function studentsWithDuplicateAdmissions(filters: MonitoringFilters) {
  const duplicateAdmissions = db.$with("duplicate_admissions").as(
    db
      .select({
        schoolId: student.schoolId,
        admissionNumber: student.admissionNumber,
        studentCount: sql<number>`count(*)::int`.as("student_count"),
      })
      .from(student)
      .innerJoin(school, eq(student.schoolId, school.id))
      .where(and(isNull(student.archivedAt), eq(school.hubId, filters.hubId)))
      .groupBy(student.schoolId, student.admissionNumber)
      .having(gt(count(), 1)),
  );
  return db
    .with(duplicateAdmissions)
    .select({
      hubName: hub.hubName,
      schoolName: school.schoolName,
      supervisorName: supervisor.supervisorName,
      admissionNumber: student.admissionNumber,
      studentName: student.studentName,
      studentCount: duplicateAdmissions.studentCount,
    })
    .from(student)
    .innerJoin(
      duplicateAdmissions,
      and(
        eq(student.schoolId, duplicateAdmissions.schoolId),
        eq(student.admissionNumber, duplicateAdmissions.admissionNumber),
      ),
    )
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        isNull(student.archivedAt),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
      ),
    )
    .orderBy(
      asc(hub.hubName),
      asc(school.schoolName),
      asc(supervisor.supervisorName),
      asc(student.admissionNumber),
      asc(student.studentName),
    );
}

async function qaStudentsSelected(filters: MonitoringFilters) {
  return db
    .select({
      studentsSelected: count(),
      questionnaireType: student.questionnaireType,
      groupName: interventionGroup.groupName,
      fellowName: fellow.fellowName,
      schoolName: school.schoolName,
      supervisorName: supervisor.supervisorName,
      hubName: hub.hubName,
    })
    .from(student)
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        isNotNull(student.questionnaireType),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(
      student.questionnaireType,
      interventionGroup.groupName,
      fellow.fellowName,
      supervisor.supervisorName,
      school.schoolName,
      hub.hubName,
    )
    .orderBy(
      asc(hub.hubName),
      asc(school.schoolName),
      asc(supervisor.supervisorName),
      asc(fellow.fellowName),
    );
}

async function prefillingData(filters: MonitoringFilters) {
  return db
    .select({
      shamiriId: student.visibleId,
      studentName: student.studentName,
      admissionNumber: student.admissionNumber,
      form: student.form,
      stream: student.stream,
      groupName: interventionGroup.groupName,
      fellowName: fellow.fellowName,
      schoolName: school.schoolName,
      supervisorName: supervisor.supervisorName,
      questionnaireType: student.questionnaireType,
      studentRows: count(),
      hubName: hub.hubName,
    })
    .from(student)
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        isNotNull(student.questionnaireType),
        isNull(student.archivedAt),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(supervisor.id, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .groupBy(
      student.visibleId,
      student.studentName,
      student.admissionNumber,
      student.form,
      student.stream,
      interventionGroup.groupName,
      fellow.fellowName,
      school.schoolName,
      supervisor.supervisorName,
      student.questionnaireType,
      hub.hubName,
    )
    .orderBy(
      asc(hub.hubName),
      asc(school.schoolName),
      asc(supervisor.supervisorName),
      asc(fellow.fellowName),
    );
}

async function recordingFidelityRatings(filters: MonitoringFilters) {
  const processedDay = dayInViewerZone(sessionRecording.processedAt, filters.timeZone);
  return db
    .select({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      sessionName: sessionName.sessionName,
      processedDay,
      overallScore: sessionRecording.overallScore,
      status: sessionRecording.status,
      schoolName: school.schoolName,
    })
    .from(sessionRecording)
    .leftJoin(interventionSession, eq(sessionRecording.sessionId, interventionSession.id))
    .leftJoin(fellow, eq(sessionRecording.fellowId, fellow.id))
    .leftJoin(school, eq(sessionRecording.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
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
      hub.hubName,
      supervisor.supervisorName,
      fellow.fellowName,
      sessionName.sessionName,
      processedDay,
      sessionRecording.overallScore,
      sessionRecording.status,
      school.schoolName,
    )
    .orderBy(
      asc(hub.hubName),
      asc(school.schoolName),
      asc(sessionName.sessionName),
      asc(supervisor.supervisorName),
    );
}

async function recordingsBySessionAndStatus(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      sessionName: sessionName.sessionName,
      status: sessionRecording.status,
      recordings: countDistinct(sessionRecording.id),
    })
    .from(sessionRecording)
    .leftJoin(interventionSession, eq(sessionRecording.sessionId, interventionSession.id))
    .leftJoin(fellow, eq(sessionRecording.fellowId, fellow.id))
    .leftJoin(school, eq(sessionRecording.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
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
    .groupBy(hub.hubName, sessionName.sessionName, sessionRecording.status)
    .orderBy(asc(hub.hubName), asc(sessionName.sessionName));
}

const shamiriAiGroupSupervisorIds = [
  "sup_01kqwe3m0we8n90yjkcv3k3kk7",
  "sup_01kqwh3fz6eh7vdxsp8b1phk6h",
];
const shamiriAiControlSupervisorIds = [
  "sup_01kqwgw6dbe06bswwdbbkrm2rs",
  "sup_01kqwg7kq2e06bswtxbk7165w8",
];

async function recordingsVsAttendanceForSupervisors(
  filters: MonitoringFilters,
  supervisorIds: string[],
) {
  const processedDay = dayInViewerZone(fellowAttendance.processedAt, filters.timeZone);
  return db
    .select({
      rowCount: count(),
      supervisorName: supervisor.supervisorName,
      schoolName: school.schoolName,
      originalFileName: sessionRecording.originalFileName,
      fellowName: fellow.fellowName,
      attended: fellowAttendance.attended,
      processedDay,
      sessionName: sessionName.sessionName,
      status: sessionRecording.status,
      groupName: interventionGroup.groupName,
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(fellow, eq(fellowAttendance.fellowId, fellow.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(sessionName, eq(interventionSession.sessionId, sessionName.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .leftJoin(hub, eq(fellow.hubId, hub.id))
    .leftJoin(interventionGroup, eq(fellowAttendance.groupId, interventionGroup.id))
    .leftJoin(sessionRecording, eq(interventionGroup.id, sessionRecording.groupId))
    .where(
      and(
        eq(fellowAttendance.attended, true),
        inArray(supervisor.id, supervisorIds),
        inArray(sessionName.sessionName, interventionSessionNames),
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
      ),
    )
    .groupBy(
      supervisor.supervisorName,
      sessionName.sessionName,
      sessionRecording.status,
      school.schoolName,
      sessionRecording.originalFileName,
      fellow.fellowName,
      fellowAttendance.attended,
      processedDay,
      interventionGroup.groupName,
    )
    .orderBy(
      desc(sessionRecording.originalFileName),
      asc(supervisor.supervisorName),
      asc(school.schoolName),
    );
}

const thikaAbSizeColumns = [
  { key: "allGroups", label: "all groups" },
  { key: "groupsAboveRange", label: "group size larger than 17" },
  { key: "groupsBelowRange", label: "group size less than 16" },
  { key: "groupsInRange", label: "groups size in between 16,17" },
  { key: "percentAboveRange", label: "percentage group size larger than 17" },
  { key: "percentBelowRange", label: "percentage group size less than 16" },
  { key: "percentInRange", label: "percentage groups without condition" },
  { key: "smallestGroup", label: "Min" },
  { key: "largestGroup", label: "Max" },
];

const correctSizeColumns = [
  { key: "allGroups", label: "all groups" },
  { key: "groupsInRange", label: "correct size groups" },
  { key: "groupsAboveRange", label: "group size larger than 15" },
  { key: "groupsBelowRange", label: "group size less than 10" },
  { key: "percentInRange", label: "percentage correct size groups" },
  { key: "smallestGroup", label: "Min" },
  { key: "largestGroup", label: "Max" },
];

const recordingsVsAttendanceColumns = [
  { key: "rowCount", label: "Count" },
  { key: "supervisorName", label: "Supervisor Name" },
  { key: "schoolName", label: "School Name" },
  { key: "originalFileName", label: "Original File Name" },
  { key: "fellowName", label: "Fellow Name" },
  { key: "attended", label: "Session Attendance" },
  { key: "processedDay", label: "Attendance Processed At: Day" },
  { key: "sessionName", label: "Session" },
  { key: "status", label: "Session Rating Status" },
  { key: "groupName", label: "Group Name" },
];

export const checksTab: MonitoringTab = {
  slug: "checks",
  title: "Checks",
  sections: [
    {
      heading: "Student upload vs fellow attendance",
      cards: [
        {
          metabaseCardId: 4662,
          title: "Missing Student upload vs Fellow attendance",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "uploadedStudents", label: "Students" },
              { key: "hubName", label: "Hub Name" },
              { key: "supervisorName", label: "Supervisor Name" },
              { key: "sessionName", label: "Session" },
              { key: "schoolName", label: "School Name" },
              { key: "fellowName", label: "Fellow Name" },
              { key: "attended", label: "Fellow Session Attendance" },
              { key: "processedDay", label: "Attendance Processed At: Day" },
              { key: "groupName", label: "Group Name" },
            ],
          },
          load: missingStudentUploads,
        },
        {
          metabaseCardId: 4727,
          title: "Missing Student upload vs Paid Fellow attendance - Summary by hub",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "groupsWithMissing", label: "Groups with missing students" },
              { key: "hubName", label: "Hub" },
            ],
          },
          load: missingStudentUploadsByHub,
        },
      ],
    },
    {
      heading: "Group size",
      cards: [
        {
          metabaseCardId: 4719,
          title: "Group size",
          width: 12,
          view: { kind: "table", columns: correctSizeColumns },
          load: correctGroupSizeOverall,
        },
        {
          metabaseCardId: 5189,
          title: "Correct group size by hubs",
          width: 12,
          view: {
            kind: "table",
            columns: [{ key: "hubName", label: "Hub" }, ...correctSizeColumns],
          },
          load: correctGroupSizeByHub,
        },
        {
          metabaseCardId: 5135,
          title: "2026 Group size A/B Test check - Term 2",
          width: 24,
          onlyForProjectVisibleId: "2026_Project_2",
          view: {
            kind: "table",
            columns: [{ key: "abCondition", label: "Condition" }, ...thikaAbSizeColumns],
          },
          load: thikaAbGroupSizeByCondition,
        },
        {
          metabaseCardId: 5139,
          title: "2026 Group size A/B Test check by school - Term 2",
          width: 24,
          onlyForProjectVisibleId: "2026_Project_2",
          view: {
            kind: "table",
            columns: [
              { key: "schoolName", label: "School" },
              { key: "abCondition", label: "Condition" },
              ...thikaAbSizeColumns,
            ],
          },
          load: thikaAbGroupSizeBySchool,
        },
      ],
    },
    {
      heading: "Duplicates and data prep",
      cards: [
        {
          metabaseCardId: 4679,
          title: "Students with duplicate admission numbers",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "schoolName", label: "School Name" },
              { key: "admissionNumber", label: "Admission number" },
              { key: "hubName", label: "Hub" },
              { key: "duplicateCount", label: "Students" },
            ],
          },
          load: duplicateAdmissionCounts,
        },
        {
          metabaseCardId: 4715,
          title: "Students with duplicate admission numbers specified",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub" },
              { key: "schoolName", label: "School" },
              { key: "supervisorName", label: "Supervisor" },
              { key: "admissionNumber", label: "Admission number" },
              { key: "studentName", label: "Student" },
              { key: "studentCount", label: "Students sharing the number" },
            ],
          },
          load: studentsWithDuplicateAdmissions,
        },
        {
          metabaseCardId: 4723,
          title: "QA students selected",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "studentsSelected", label: "Students" },
              { key: "questionnaireType", label: "Questionnaire type" },
              { key: "groupName", label: "Group Name" },
              { key: "fellowName", label: "Fellow Name" },
              { key: "schoolName", label: "School Name" },
              { key: "supervisorName", label: "Supervisor Name" },
              { key: "hubName", label: "Hub Name" },
            ],
          },
          load: qaStudentsSelected,
        },
        {
          metabaseCardId: 4742,
          title: "Prefilling data",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "shamiriId", label: "Shamiri ID" },
              { key: "studentName", label: "Student name" },
              { key: "admissionNumber", label: "Admission number" },
              { key: "form", label: "What class are you in?" },
              { key: "stream", label: "Stream" },
              { key: "groupName", label: "Group Number" },
              { key: "fellowName", label: "Group Leader Name" },
              { key: "schoolName", label: "School Name" },
              { key: "supervisorName", label: "Supervisor name" },
              { key: "questionnaireType", label: "Questionnaire type" },
              { key: "studentRows", label: "Count" },
              { key: "hubName", label: "Hub" },
            ],
          },
          load: prefillingData,
        },
      ],
    },
    {
      heading: "Session recordings and fidelity",
      cards: [
        {
          metabaseCardId: 4712,
          title: "Session Recordings Fidelity Ratings",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub Name" },
              { key: "supervisorName", label: "Supervisor Name" },
              { key: "fellowName", label: "Fellow Name" },
              { key: "sessionName", label: "Session" },
              { key: "processedDay", label: "Processed At: Day" },
              { key: "overallScore", label: "Overall score" },
              { key: "status", label: "Status" },
              { key: "schoolName", label: "School Name" },
            ],
          },
          load: recordingFidelityRatings,
        },
        {
          metabaseCardId: 5096,
          title: "Session Recordings",
          width: 24,
          view: {
            kind: "bar",
            x: "sessionName",
            xLabel: "Session",
            breakout: "status",
            value: "recordings",
            stacked: true,
          },
          load: recordingsBySessionAndStatus,
        },
        {
          metabaseCardId: 5137,
          title: "Session Fidelity Ratings vs Fellow attendance - ShamiriAI group - Term 2",
          width: 24,
          onlyForProjectVisibleId: "2026_Project_2",
          view: { kind: "table", columns: recordingsVsAttendanceColumns },
          load: (filters) =>
            recordingsVsAttendanceForSupervisors(filters, shamiriAiGroupSupervisorIds),
        },
        {
          metabaseCardId: 5138,
          title: "Session Fidelity Ratings vs Fellow attendance - ShamiriAI control - Term 2",
          width: 24,
          onlyForProjectVisibleId: "2026_Project_2",
          view: { kind: "table", columns: recordingsVsAttendanceColumns },
          load: (filters) =>
            recordingsVsAttendanceForSupervisors(filters, shamiriAiControlSupervisorIds),
        },
      ],
    },
  ],
};
