import {
  and,
  asc,
  count,
  countDistinct,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  notBetween,
  notInArray,
  sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellow,
  hub,
  interventionGroup,
  interventionSession,
  interventionSessionRating,
  school,
  student,
  studentAttendance,
  supervisor,
} from "#/db/schema";
import { matchesIfSet, minuteInViewerZone, updatedAtAsMetabaseRead } from "#/lib/monitoring/sql";
import type { MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

const interventionSessionTypes = ["s1", "s2", "s3", "s4"];

const sessionUpdatedAt = updatedAtAsMetabaseRead(interventionSession.updatedAt);
const scheduledBeforeSession = lt(sessionUpdatedAt, interventionSession.sessionDate);
const scheduledAfterSession = lt(interventionSession.sessionDate, sessionUpdatedAt);

async function timelySchedulingByHub(filters: MonitoringFilters) {
  const percentTimely =
    sql<number>`100 * (count(*) filter (where ${scheduledBeforeSession}))::float / nullif(count(*) filter (where ${scheduledBeforeSession} or ${scheduledAfterSession}), 0)`.mapWith(
      Number,
    );
  return db
    .select({ hubName: hub.hubName, percentTimely })
    .from(interventionSession)
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(percentTimely));
}

async function sessionsScheduled(
  filters: MonitoringFilters,
  schedulingCondition: SQL,
  supervisorId: string | null,
) {
  const sessionDate = minuteInViewerZone(interventionSession.sessionDate, filters.timeZone).as(
    "session_date_minute",
  );
  const updatedAt = minuteInViewerZone(interventionSession.updatedAt, filters.timeZone).as(
    "updated_at_minute",
  );
  return db
    .selectDistinct({
      hubName: hub.hubName,
      schoolName: school.schoolName,
      sessionType: interventionSession.sessionType,
      sessionDate,
      updatedAt,
    })
    .from(interventionSession)
    .leftJoin(hub, eq(interventionSession.hubId, hub.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        schedulingCondition,
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, supervisorId),
      ),
    )
    .orderBy(asc(hub.hubName), asc(sessionDate));
}

async function sessionRatingsByHub(filters: MonitoringFilters) {
  const ratingsPerSession = db
    .select({
      sessionId: interventionSessionRating.sessionId,
      hasBehaviorRating:
        sql<boolean>`bool_or(${interventionSessionRating.studentBehaviorRating} is not null)`.as(
          "has_behavior_rating",
        ),
      hasAdminRating:
        sql<boolean>`bool_or(${interventionSessionRating.adminSupportRating} is not null)`.as(
          "has_admin_rating",
        ),
      hasWorkloadRating:
        sql<boolean>`bool_or(${interventionSessionRating.workloadRating} is not null)`.as(
          "has_workload_rating",
        ),
    })
    .from(interventionSessionRating)
    .groupBy(interventionSessionRating.sessionId)
    .as("ratings_per_session");

  const totalSessions = countDistinct(interventionSession.id);
  const anyRating = sql`${ratingsPerSession.hasBehaviorRating} or ${ratingsPerSession.hasAdminRating} or ${ratingsPerSession.hasWorkloadRating}`;
  const allRatings = sql`${ratingsPerSession.hasBehaviorRating} and ${ratingsPerSession.hasAdminRating} and ${ratingsPerSession.hasWorkloadRating}`;
  const sessionsWithAnyRating = sql<number>`count(*) filter (where ${anyRating})`.mapWith(Number);
  const sessionsWithAllRatings = sql<number>`count(*) filter (where ${allRatings})`.mapWith(Number);
  const percentWithAnyRating =
    sql<number>`round((count(*) filter (where ${anyRating}))::numeric * 100 / nullif(${totalSessions}, 0), 1)`.mapWith(
      Number,
    );
  const percentWithAllRatings =
    sql<number>`round((count(*) filter (where ${allRatings}))::numeric * 100 / nullif(${totalSessions}, 0), 1)`.mapWith(
      Number,
    );

  return db
    .select({
      hubName: hub.hubName,
      totalSessions,
      sessionsWithAnyRating,
      percentWithAnyRating,
      sessionsWithAllRatings,
      percentWithAllRatings,
    })
    .from(interventionSession)
    .innerJoin(school, eq(interventionSession.schoolId, school.id))
    .innerJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(ratingsPerSession, eq(ratingsPerSession.sessionId, interventionSession.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        eq(interventionSession.occurred, true),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(percentWithAnyRating), asc(hub.hubName));
}

async function studentsAttendedAnySessionByHub(filters: MonitoringFilters) {
  const attendedByHub = db
    .select({
      hubId: hub.id,
      attendedStudents: countDistinct(studentAttendance.studentId).as("attended_students"),
    })
    .from(studentAttendance)
    .innerJoin(
      student,
      and(eq(student.id, studentAttendance.studentId), isNull(student.archivedAt)),
    )
    .innerJoin(interventionSession, eq(interventionSession.id, studentAttendance.sessionId))
    .innerJoin(school, eq(school.id, interventionSession.schoolId))
    .innerJoin(hub, eq(hub.id, school.hubId))
    .where(
      and(
        inArray(interventionSession.sessionType, interventionSessionTypes),
        eq(studentAttendance.attended, true),
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
      ),
    )
    .groupBy(hub.id)
    .as("attended_by_hub");

  const studentsByHub = db
    .select({
      hubId: hub.id,
      hubName: hub.hubName,
      totalStudents: countDistinct(student.id).as("total_students"),
    })
    .from(student)
    .innerJoin(school, eq(school.id, student.schoolId))
    .innerJoin(hub, eq(hub.id, school.hubId))
    .where(
      and(
        isNull(student.archivedAt),
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
      ),
    )
    .groupBy(hub.id, hub.hubName)
    .as("students_by_hub");

  const attendedStudents = sql<number>`coalesce(${attendedByHub.attendedStudents}, 0)`.mapWith(
    Number,
  );
  const percentAttended =
    sql<number>`round(100.0 * coalesce(${attendedByHub.attendedStudents}, 0) / nullif(${studentsByHub.totalStudents}, 0), 1)`.mapWith(
      Number,
    );

  return db
    .select({
      hubName: studentsByHub.hubName,
      totalStudents: studentsByHub.totalStudents,
      attendedStudents,
      percentAttended,
    })
    .from(studentsByHub)
    .leftJoin(attendedByHub, eq(studentsByHub.hubId, attendedByHub.hubId))
    .orderBy(asc(percentAttended));
}

async function studentsAttendedAllSessionsByHub(filters: MonitoringFilters) {
  const studentsAttendedAll = db
    .select({ studentId: studentAttendance.studentId, hubId: hub.id })
    .from(studentAttendance)
    .innerJoin(
      student,
      and(eq(student.id, studentAttendance.studentId), isNull(student.archivedAt)),
    )
    .innerJoin(interventionSession, eq(interventionSession.id, studentAttendance.sessionId))
    .innerJoin(school, eq(school.id, interventionSession.schoolId))
    .innerJoin(hub, eq(hub.id, school.hubId))
    .where(
      and(
        inArray(interventionSession.sessionType, interventionSessionTypes),
        eq(studentAttendance.attended, true),
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
      ),
    )
    .groupBy(studentAttendance.studentId, hub.id)
    .having(sql`count(distinct ${interventionSession.sessionType}) = 4`)
    .as("students_attended_all");

  const attendedByHub = db
    .select({
      hubId: studentsAttendedAll.hubId,
      attendedStudents: count().as("attended_students"),
    })
    .from(studentsAttendedAll)
    .groupBy(studentsAttendedAll.hubId)
    .as("attended_by_hub");

  const studentsByHub = db
    .select({
      hubId: hub.id,
      hubName: hub.hubName,
      totalStudents: countDistinct(student.id).as("total_students"),
    })
    .from(student)
    .innerJoin(school, eq(school.id, student.schoolId))
    .innerJoin(hub, eq(hub.id, school.hubId))
    .where(and(eq(hub.projectId, filters.projectId), eq(hub.id, filters.hubId)))
    .groupBy(hub.id, hub.hubName)
    .as("students_by_hub");

  const attendedStudents = sql<number>`coalesce(${attendedByHub.attendedStudents}, 0)`.mapWith(
    Number,
  );
  const percentAttended =
    sql<number>`round(100.0 * coalesce(${attendedByHub.attendedStudents}, 0) / nullif(${studentsByHub.totalStudents}, 0), 1)`.mapWith(
      Number,
    );

  return db
    .select({
      hubName: studentsByHub.hubName,
      totalStudents: studentsByHub.totalStudents,
      attendedStudents,
      percentAttended,
    })
    .from(studentsByHub)
    .leftJoin(attendedByHub, eq(studentsByHub.hubId, attendedByHub.hubId))
    .orderBy(asc(percentAttended), asc(studentsByHub.hubName));
}

function groupSizeCounts(groupSize: SQL.Aliased<number>) {
  const correctSize = sql`count(*) filter (where ${groupSize} between 10 and 15)`;
  return {
    groupsOver15: sql<number>`count(*) filter (where ${groupSize} > 15)`.mapWith(Number),
    groupsUnder10: sql<number>`count(*) filter (where ${groupSize} < 10)`.mapWith(Number),
    allGroups: count(),
    correctSizeGroups: sql<number>`${correctSize}`.mapWith(Number),
    percentCorrectSize: sql<number>`100 * (${correctSize})::float / nullif(count(*), 0)`.mapWith(
      Number,
    ),
  };
}

async function correctGroupSizeByHub(filters: MonitoringFilters) {
  const groupSizes = db
    .select({
      groupId: interventionGroup.id,
      hubName: hub.hubName,
      groupSize: countDistinct(student.id).as("group_size"),
    })
    .from(interventionGroup)
    .leftJoin(school, eq(interventionGroup.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(student, eq(interventionGroup.id, student.assignedGroupId))
    .where(and(eq(hub.projectId, filters.projectId), eq(hub.id, filters.hubId)))
    .groupBy(interventionGroup.id, hub.hubName)
    .as("group_sizes");

  const counts = groupSizeCounts(groupSizes.groupSize);
  return db
    .select({ hubName: groupSizes.hubName, ...counts })
    .from(groupSizes)
    .where(gt(groupSizes.groupSize, 0))
    .groupBy(groupSizes.hubName)
    .orderBy(asc(counts.percentCorrectSize), asc(groupSizes.hubName));
}

async function groupSizeSummary(filters: MonitoringFilters) {
  const groupSizes = db
    .select({
      groupId: interventionGroup.id,
      groupSize: countDistinct(student.id).as("group_size"),
    })
    .from(interventionGroup)
    .leftJoin(school, eq(interventionGroup.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(student, eq(interventionGroup.id, student.assignedGroupId))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        isNull(interventionGroup.archivedAt),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
        matchesIfSet(interventionGroup.leaderId, filters.fellowId),
      ),
    )
    .groupBy(interventionGroup.id)
    .as("group_sizes");

  return db
    .select({
      ...groupSizeCounts(groupSizes.groupSize),
      smallestGroup: sql<number>`min(${groupSizes.groupSize})`.mapWith(Number),
      largestGroup: sql<number>`max(${groupSizes.groupSize})`.mapWith(Number),
    })
    .from(groupSizes)
    .where(gt(groupSizes.groupSize, 0));
}

const averagePercentSchoolDataComplete =
  sql<number>`avg(num_nonnulls(${school.schoolName}, ${school.schoolType}, ${school.schoolCounty}, ${school.schoolSubCounty}, ${school.schoolDemographics}, ${school.pointPersonName}, ${school.pointPersonPhone}, ${school.numbersExpected}, ${school.boardingDay})::float / 9 * 100)`.mapWith(
    Number,
  );

async function schoolDataCompletenessByHub(filters: MonitoringFilters) {
  return db
    .select({ hubName: hub.hubName, percentComplete: averagePercentSchoolDataComplete })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(averagePercentSchoolDataComplete));
}

async function incompleteSchoolData(filters: MonitoringFilters) {
  return db
    .select({
      hubName: hub.hubName,
      schoolName: school.schoolName,
      schoolType: school.schoolType,
      boardingDay: school.boardingDay,
      schoolDemographics: school.schoolDemographics,
      schoolCounty: school.schoolCounty,
      schoolSubCounty: school.schoolSubCounty,
      pointPersonName: school.pointPersonName,
      pointPersonPhone: school.pointPersonPhone,
      numbersExpected: school.numbersExpected,
      percentComplete: averagePercentSchoolDataComplete,
    })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
      ),
    )
    .groupBy(
      hub.hubName,
      school.schoolName,
      school.schoolType,
      school.boardingDay,
      school.schoolDemographics,
      school.schoolCounty,
      school.schoolSubCounty,
      school.pointPersonName,
      school.pointPersonPhone,
      school.numbersExpected,
    )
    .orderBy(asc(averagePercentSchoolDataComplete));
}

function studentReviewScope(filters: MonitoringFilters) {
  return and(
    eq(hub.projectId, filters.projectId),
    eq(hub.id, filters.hubId),
    isNull(student.archivedAt),
    matchesIfSet(school.id, filters.schoolId),
    matchesIfSet(fellow.supervisorId, filters.supervisorId),
    matchesIfSet(fellow.id, filters.fellowId),
  );
}

async function studentGenderToReview(filters: MonitoringFilters) {
  return db
    .selectDistinct({
      gender: student.gender,
      hubName: hub.hubName,
      schoolName: school.schoolName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      studentName: student.studentName,
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .where(and(studentReviewScope(filters), eq(student.gender, "Other")))
    .orderBy(
      asc(hub.hubName),
      asc(school.schoolName),
      asc(supervisor.supervisorName),
      asc(fellow.fellowName),
      asc(student.studentName),
    );
}

async function studentAgeToConfirm(filters: MonitoringFilters) {
  // ponytail: 2025 is the base year on the Metabase card, so ages drift in later years; derive it from the project's year if the card outlives this cohort.
  const age = sql<number>`2025 - ${student.yearOfBirth}`.mapWith(Number);
  return db
    .select({
      age,
      studentName: student.studentName,
      schoolName: school.schoolName,
      groupName: interventionGroup.groupName,
      fellowName: fellow.fellowName,
      supervisorName: supervisor.supervisorName,
      hubName: hub.hubName,
      studentCount: count(),
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .where(and(studentReviewScope(filters), notBetween(age, 10, 22)))
    .groupBy(
      age,
      student.studentName,
      school.schoolName,
      interventionGroup.groupName,
      fellow.fellowName,
      supervisor.supervisorName,
      hub.hubName,
    )
    .orderBy(asc(hub.hubName), asc(supervisor.supervisorName), asc(fellow.fellowName));
}

async function studentFormToConfirm(filters: MonitoringFilters) {
  return db
    .selectDistinct({
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      fellowName: fellow.fellowName,
      schoolName: school.schoolName,
      studentName: student.studentName,
      form: student.form,
      groupName: interventionGroup.groupName,
    })
    .from(student)
    .leftJoin(school, eq(student.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(interventionGroup, eq(student.assignedGroupId, interventionGroup.id))
    .leftJoin(fellow, eq(interventionGroup.leaderId, fellow.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .where(and(studentReviewScope(filters), notInArray(student.form, [3, 4, 10])))
    .orderBy(asc(hub.hubName), asc(school.schoolName), asc(supervisor.supervisorName));
}

async function fellowAgeToConfirm(filters: MonitoringFilters) {
  const age =
    sql<number>`extract(year from age(${fellow.createdAt}, ${fellow.dateOfBirth}))::int`.mapWith(
      Number,
    );
  return db
    .selectDistinct({
      age,
      fellowName: fellow.fellowName,
      supervisorName: supervisor.supervisorName,
      hubName: hub.hubName,
    })
    .from(fellow)
    .leftJoin(hub, eq(fellow.hubId, hub.id))
    .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        lt(age, 18),
        matchesIfSet(fellow.supervisorId, filters.supervisorId),
        matchesIfSet(fellow.id, filters.fellowId),
      ),
    )
    .orderBy(asc(age), asc(fellow.fellowName), asc(supervisor.supervisorName), asc(hub.hubName));
}

async function supervisorDataCompletenessByHub(filters: MonitoringFilters) {
  const percentComplete =
    sql<number>`avg(num_nonnulls(${supervisor.supervisorName}, ${supervisor.personalEmail}, ${supervisor.idNumber}, ${supervisor.cellNumber}, ${supervisor.mpesaName}, ${supervisor.mpesaNumber}, ${supervisor.county}, ${supervisor.subCounty}, ${supervisor.dateOfBirth}, ${supervisor.gender})::float / 10 * 100)`.mapWith(
      Number,
    );
  return db
    .select({ hubName: hub.hubName, percentComplete })
    .from(supervisor)
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .where(
      and(
        eq(hub.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(supervisor.id, filters.supervisorId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(percentComplete));
}

const scheduledSessionColumns = [
  { key: "hubName", label: "Hub" },
  { key: "schoolName", label: "School" },
  { key: "sessionType", label: "Session type" },
  { key: "sessionDate", label: "Session date" },
  { key: "updatedAt", label: "Updated at" },
];

export const hubSdhUseTab: MonitoringTab = {
  slug: "hub-sdh-use",
  title: "Hub SDH Use",
  sections: [
    {
      heading: "Session scheduling",
      cards: [
        {
          metabaseCardId: 4733,
          title: "Percentage of timely scheduled sessions, by Hubs",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            yLabel: "Timely scheduled sessions (%)",
            series: [{ key: "percentTimely", label: "Percentage timely scheduled sessions" }],
          },
          load: timelySchedulingByHub,
        },
        {
          metabaseCardId: 4637,
          title: "Late session scheduling, by Hubs",
          width: 24,
          view: { kind: "table", columns: scheduledSessionColumns },
          load: (filters) =>
            sessionsScheduled(filters, scheduledAfterSession, filters.supervisorId),
        },
        {
          metabaseCardId: 4699,
          title: "Timely session scheduling, by Hubs",
          width: 24,
          view: { kind: "table", columns: scheduledSessionColumns },
          load: (filters) => sessionsScheduled(filters, scheduledBeforeSession, null),
        },
      ],
    },
    {
      heading: "Session rating",
      cards: [
        {
          metabaseCardId: 4721,
          title: "Percentage of sessions with ratings",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            yLabel: "Sessions with ratings (%)",
            series: [{ key: "percentWithAllRatings", label: "Sessions with all ratings (%)" }],
          },
          load: sessionRatingsByHub,
        },
      ],
    },
    {
      heading: "Student Attendance",
      cards: [
        {
          metabaseCardId: 4667,
          title: "Students who attended at least 1 intervention session",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            yLabel: "Students attended at least 1 session (%)",
            series: [{ key: "percentAttended", label: "Students attended at least 1 session (%)" }],
          },
          load: studentsAttendedAnySessionByHub,
        },
        {
          metabaseCardId: 4664,
          title: "Students who attended all 4 intervention sessions",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            yLabel: "Students attended all sessions (%)",
            stacked: true,
            series: [{ key: "percentAttended", label: "Students attended all sessions (%)" }],
          },
          load: studentsAttendedAllSessionsByHub,
        },
      ],
    },
    {
      heading: "Student group size",
      cards: [
        {
          metabaseCardId: 4693,
          title: "Percentage of groups with 10-15 students by hubs",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            yLabel: "Groups with correct size (%)",
            series: [{ key: "percentCorrectSize", label: "Groups with correct size (%)" }],
          },
          load: correctGroupSizeByHub,
        },
        {
          metabaseCardId: 4672,
          title: "Group size",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "groupsOver15", label: "Group size larger than 15" },
              { key: "groupsUnder10", label: "Group size less than 10" },
              { key: "allGroups", label: "All groups" },
              { key: "correctSizeGroups", label: "Correct size groups" },
              { key: "percentCorrectSize", label: "Percentage correct size groups" },
              { key: "smallestGroup", label: "Min" },
              { key: "largestGroup", label: "Max" },
            ],
          },
          load: groupSizeSummary,
        },
      ],
    },
    {
      heading: "School data completeness",
      cards: [
        {
          metabaseCardId: 4732,
          title: "Percentage of complete school data entered",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            yLabel: "Complete student data (%)",
            series: [{ key: "percentComplete", label: "Average" }],
          },
          load: schoolDataCompletenessByHub,
        },
        {
          metabaseCardId: 4665,
          title: "Incomplete school data fields",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub" },
              { key: "schoolName", label: "School" },
              { key: "schoolType", label: "School type" },
              { key: "boardingDay", label: "Boarding day" },
              { key: "schoolDemographics", label: "School demographics" },
              { key: "schoolCounty", label: "School county" },
              { key: "schoolSubCounty", label: "School sub county" },
              { key: "pointPersonName", label: "Point person name" },
              { key: "pointPersonPhone", label: "Point person phone" },
              { key: "numbersExpected", label: "Numbers expected" },
              { key: "percentComplete", label: "Average" },
            ],
          },
          load: incompleteSchoolData,
        },
      ],
    },
    {
      heading: "Student data quality",
      cards: [
        {
          metabaseCardId: 4708,
          title: "Students gender to be reviewed",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "gender", label: "Gender" },
              { key: "hubName", label: "Hub" },
              { key: "schoolName", label: "School" },
              { key: "supervisorName", label: "Supervisor" },
              { key: "fellowName", label: "Fellow" },
              { key: "studentName", label: "Student name" },
            ],
          },
          load: studentGenderToReview,
        },
        {
          metabaseCardId: 4663,
          title: "Students age to be confirmed",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "age", label: "Age" },
              { key: "studentName", label: "Student name" },
              { key: "schoolName", label: "School" },
              { key: "groupName", label: "Group name" },
              { key: "fellowName", label: "Fellow" },
              { key: "supervisorName", label: "Supervisor" },
              { key: "hubName", label: "Hub" },
              { key: "studentCount", label: "Count" },
            ],
          },
          load: studentAgeToConfirm,
        },
        {
          metabaseCardId: 4738,
          title: "Students form to be confirmed",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "hubName", label: "Hub" },
              { key: "supervisorName", label: "Supervisor" },
              { key: "fellowName", label: "Fellow" },
              { key: "schoolName", label: "School" },
              { key: "studentName", label: "Student name" },
              { key: "form", label: "Form" },
              { key: "groupName", label: "Group Name" },
            ],
          },
          load: studentFormToConfirm,
        },
      ],
    },
    {
      heading: "Fellow data quality",
      cards: [
        {
          metabaseCardId: 4687,
          title: "Fellows age to be confirmed",
          width: 24,
          view: {
            kind: "table",
            columns: [
              { key: "age", label: "Age" },
              { key: "fellowName", label: "Fellow name" },
              { key: "supervisorName", label: "Supervisor name" },
              { key: "hubName", label: "Hub name" },
            ],
          },
          load: fellowAgeToConfirm,
        },
      ],
    },
    {
      heading: "Supervisor data completeness",
      cards: [
        {
          metabaseCardId: 4728,
          title: "Percentage of complete supervisor data, Grouped by Hubs",
          width: 24,
          view: {
            kind: "bar",
            x: "hubName",
            series: [{ key: "percentComplete", label: "Average" }],
          },
          load: supervisorDataCompletenessByHub,
        },
      ],
    },
  ],
};
