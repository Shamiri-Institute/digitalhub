import { and, asc, count, countDistinct, desc, eq, max, ne, sql } from "drizzle-orm";

import { db } from "#/db/client";
import {
  fellowAttendance,
  hub,
  interventionSession,
  interventionSessionRating,
  school,
  supervisor,
} from "#/db/schema";
import { matchesIfSet } from "#/lib/monitoring/sql";
import type { MonitoringCard, MonitoringFilters, MonitoringTab } from "#/lib/monitoring/types";

const actualSchools =
  sql<number>`count(*) - count(*) filter (where ${school.droppedOut} = true)`.mapWith(Number);

function schoolInHubConditions(filters: MonitoringFilters) {
  return and(
    eq(hub.projectId, filters.projectId),
    eq(hub.id, filters.hubId),
    matchesIfSet(school.id, filters.schoolId),
  );
}

async function schoolsByDropoutStatus(filters: MonitoringFilters) {
  return db
    .select({ droppedOut: school.droppedOut, schools: count() })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        schoolInHubConditions(filters),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
      ),
    )
    .groupBy(school.droppedOut)
    .orderBy(asc(school.droppedOut));
}

async function schoolsActualVsTarget(filters: MonitoringFilters) {
  return db
    .select({ actualSchools, targetSchools: count() })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(schoolInHubConditions(filters));
}

async function schoolsByHub(filters: MonitoringFilters) {
  return db
    .select({ hubName: hub.hubName, schools: count() })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        schoolInHubConditions(filters),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
      ),
    )
    .groupBy(hub.hubName)
    .orderBy(asc(hub.hubName));
}

async function schoolsActualVsTargetByHub(filters: MonitoringFilters) {
  return db
    .select({ hubName: hub.hubName, actualSchools, targetSchools: count() })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(schoolInHubConditions(filters))
    .groupBy(hub.hubName)
    .orderBy(asc(hub.hubName));
}

async function schoolStatusPerHub(filters: MonitoringFilters) {
  const schoolStatus = sql<string>`case when ${school.droppedOut} = true then 'Dropped out' else 'Active' end`;
  return db
    .select({ schoolStatus, hubName: hub.hubName, schools: count() })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        schoolInHubConditions(filters),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
      ),
    )
    .groupBy(schoolStatus, hub.hubName)
    .orderBy(asc(schoolStatus), asc(hub.hubName));
}

async function schoolsByProfileField(
  profileField:
    | typeof school.schoolType
    | typeof school.schoolDemographics
    | typeof school.schoolCounty,
  filters: MonitoringFilters,
) {
  return db
    .select({ category: profileField, schools: count() })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        schoolInHubConditions(filters),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
      ),
    )
    .groupBy(profileField)
    .orderBy(asc(profileField));
}

async function schoolsThatHadEachSession(filters: MonitoringFilters) {
  return db
    .select({
      sessionType: interventionSession.sessionType,
      schools: countDistinct(interventionSession.schoolId),
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(fellowAttendance.supervisorId, filters.supervisorId),
        ne(interventionSession.sessionType, ""),
      ),
    )
    .groupBy(interventionSession.sessionType)
    .orderBy(asc(interventionSession.sessionType));
}

async function schoolSessionProgress(filters: MonitoringFilters) {
  const latestSessionType = max(interventionSession.sessionType);
  return db
    .select({
      schoolName: school.schoolName,
      hubName: hub.hubName,
      supervisorName: supervisor.supervisorName,
      latestSessionType,
    })
    .from(interventionSession)
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .leftJoin(supervisor, eq(school.assignedSupervisorId, supervisor.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
        eq(interventionSession.occurred, true),
      ),
    )
    .groupBy(school.schoolName, hub.hubName, supervisor.supervisorName)
    .orderBy(desc(latestSessionType), asc(hub.hubName));
}

async function schoolsThatHadEachSessionPerHub(filters: MonitoringFilters) {
  return db
    .select({
      sessionType: interventionSession.sessionType,
      hubName: hub.hubName,
      schools: countDistinct(interventionSession.schoolId),
    })
    .from(fellowAttendance)
    .leftJoin(interventionSession, eq(fellowAttendance.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        eq(interventionSession.projectId, filters.projectId),
        eq(hub.id, filters.hubId),
        matchesIfSet(school.id, filters.schoolId),
        matchesIfSet(fellowAttendance.supervisorId, filters.supervisorId),
      ),
    )
    .groupBy(interventionSession.sessionType, hub.hubName)
    .orderBy(asc(interventionSession.sessionType), asc(hub.hubName));
}

async function schoolDropoutReasons(filters: MonitoringFilters) {
  return db
    .select({ dropoutReason: school.dropoutReason, schools: count() })
    .from(school)
    .leftJoin(hub, eq(school.hubId, hub.id))
    .where(
      and(
        schoolInHubConditions(filters),
        matchesIfSet(school.assignedSupervisorId, filters.supervisorId),
        eq(school.droppedOut, true),
      ),
    )
    .groupBy(school.dropoutReason)
    .orderBy(asc(school.dropoutReason));
}

function ratingConditions(filters: MonitoringFilters) {
  return and(
    eq(hub.projectId, filters.projectId),
    eq(hub.id, filters.hubId),
    matchesIfSet(school.id, filters.schoolId),
    matchesIfSet(supervisor.id, filters.supervisorId),
  );
}

type RatingColumn =
  | typeof interventionSessionRating.studentBehaviorRating
  | typeof interventionSessionRating.adminSupportRating
  | typeof interventionSessionRating.workloadRating;

function averageOf(ratingColumn: RatingColumn) {
  return sql<number>`avg(${ratingColumn})::float`.mapWith(Number);
}

async function averageRatingsPerSession(filters: MonitoringFilters) {
  return db
    .select({
      sessionType: interventionSession.sessionType,
      studentBehavior: averageOf(interventionSessionRating.studentBehaviorRating),
      adminSupport: averageOf(interventionSessionRating.adminSupportRating),
      workload: averageOf(interventionSessionRating.workloadRating),
    })
    .from(interventionSessionRating)
    .leftJoin(supervisor, eq(interventionSessionRating.supervisorId, supervisor.id))
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .leftJoin(interventionSession, eq(interventionSessionRating.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .where(ratingConditions(filters))
    .groupBy(interventionSession.sessionType)
    .orderBy(asc(interventionSession.sessionType));
}

async function averageRatingByHub(ratingColumn: RatingColumn, filters: MonitoringFilters) {
  return db
    .select({ hubName: hub.hubName, averageRating: averageOf(ratingColumn) })
    .from(interventionSessionRating)
    .leftJoin(supervisor, eq(interventionSessionRating.supervisorId, supervisor.id))
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .leftJoin(interventionSession, eq(interventionSessionRating.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .where(ratingConditions(filters))
    .groupBy(hub.hubName)
    .orderBy(asc(hub.hubName));
}

async function averageRatingPerSessionPerHub(
  ratingColumn: RatingColumn,
  filters: MonitoringFilters,
) {
  return db
    .select({
      sessionType: interventionSession.sessionType,
      hubName: hub.hubName,
      averageRating: averageOf(ratingColumn),
    })
    .from(interventionSessionRating)
    .leftJoin(supervisor, eq(interventionSessionRating.supervisorId, supervisor.id))
    .leftJoin(hub, eq(supervisor.hubId, hub.id))
    .leftJoin(interventionSession, eq(interventionSessionRating.sessionId, interventionSession.id))
    .leftJoin(school, eq(interventionSession.schoolId, school.id))
    .where(ratingConditions(filters))
    .groupBy(interventionSession.sessionType, hub.hubName)
    .orderBy(asc(interventionSession.sessionType), asc(hub.hubName));
}

const ratingByHubView: MonitoringCard["view"] = {
  kind: "bar",
  x: "hubName",
  series: [{ key: "averageRating", label: "Average rating" }],
};

const ratingPerSessionPerHubView: MonitoringCard["view"] = {
  kind: "bar",
  x: "sessionType",
  breakout: "hubName",
  value: "averageRating",
};

export const schoolsTab: MonitoringTab = {
  slug: "schools",
  title: "Schools",
  sections: [
    {
      heading: "Overview",
      cards: [
        {
          metabaseCardId: 4735,
          title: "Active Schools",
          width: 12,
          view: {
            kind: "bar",
            x: "droppedOut",
            xLabel: "Has School Dropped Out",
            series: [{ key: "schools", label: "Count" }],
          },
          load: schoolsByDropoutStatus,
        },
        {
          metabaseCardId: 4670,
          title: "Schools actual vs. target",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "actualSchools", label: "Actual schools" },
              { key: "targetSchools", label: "Target Schools" },
            ],
          },
          load: schoolsActualVsTarget,
        },
        {
          metabaseCardId: 4652,
          title: "Schools grouped by hub",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            xLabel: "Hub",
            series: [{ key: "schools", label: "Count" }],
          },
          load: schoolsByHub,
        },
        {
          metabaseCardId: 4645,
          title: "Schools actual vs. target by hubs",
          width: 12,
          view: {
            kind: "bar",
            x: "hubName",
            xLabel: "Has School Dropped Out",
            series: [
              { key: "actualSchools", label: "Actual schools" },
              { key: "targetSchools", label: "Target schools" },
            ],
          },
          load: schoolsActualVsTargetByHub,
        },
        {
          metabaseCardId: 4747,
          title: "Active Schools per hub",
          width: 24,
          view: {
            kind: "bar",
            x: "schoolStatus",
            xLabel: "Has School Dropped Out",
            breakout: "hubName",
            value: "schools",
          },
          load: schoolStatusPerHub,
        },
      ],
    },
    {
      heading: "School profile",
      cards: [
        {
          metabaseCardId: 4668,
          title: "Schools grouped by school type",
          width: 8,
          view: { kind: "pie", name: "category", value: "schools" },
          load: (filters) => schoolsByProfileField(school.schoolType, filters),
        },
        {
          metabaseCardId: 4677,
          title: "Schools grouped by gender demographics",
          width: 8,
          view: { kind: "pie", name: "category", value: "schools" },
          load: (filters) => schoolsByProfileField(school.schoolDemographics, filters),
        },
        {
          metabaseCardId: 4656,
          title: "Schools grouped by school county",
          width: 8,
          view: { kind: "pie", name: "category", value: "schools" },
          load: (filters) => schoolsByProfileField(school.schoolCounty, filters),
        },
      ],
    },
    {
      heading: "Session progress",
      cards: [
        {
          metabaseCardId: 4678,
          title: "Count of schools that have had the session",
          width: 12,
          view: {
            kind: "bar",
            x: "sessionType",
            xLabel: "Sessions",
            yLabel: "Number of schools",
            series: [{ key: "schools", label: "Count" }],
          },
          load: schoolsThatHadEachSession,
        },
        {
          metabaseCardId: 4635,
          title: "School session progress",
          width: 12,
          view: {
            kind: "table",
            columns: [
              { key: "schoolName", label: "School Name" },
              { key: "hubName", label: "Hub Name" },
              { key: "supervisorName", label: "Supervisor Name" },
              { key: "latestSessionType", label: "Max of Session Type" },
            ],
          },
          load: schoolSessionProgress,
        },
        {
          metabaseCardId: 4730,
          title: "Count of schools that have had the session per hub",
          width: 24,
          view: {
            kind: "bar",
            x: "sessionType",
            xLabel: "Sessions",
            yLabel: "Number of schools",
            breakout: "hubName",
            value: "schools",
          },
          load: schoolsThatHadEachSessionPerHub,
        },
      ],
    },
    {
      heading: "Dropouts",
      cards: [
        {
          metabaseCardId: 4759,
          title: "School drop out reasons",
          width: 24,
          view: { kind: "pie", name: "dropoutReason", value: "schools" },
          load: schoolDropoutReasons,
        },
      ],
    },
    {
      heading: "Session ratings",
      cards: [
        {
          metabaseCardId: 4741,
          title: "Average Intervention Session Ratings Per Session",
          width: 24,
          view: {
            kind: "bar",
            x: "sessionType",
            series: [
              { key: "studentBehavior", label: "Average of Student Behavior Rating" },
              { key: "adminSupport", label: "Average of Admin Support Rating" },
              { key: "workload", label: "Average of Workload Rating" },
            ],
          },
          load: averageRatingsPerSession,
        },
        {
          metabaseCardId: 4757,
          title: "Average of intervention session admin support rating",
          width: 8,
          view: ratingByHubView,
          load: (filters) =>
            averageRatingByHub(interventionSessionRating.adminSupportRating, filters),
        },
        {
          metabaseCardId: 4710,
          title: "Average of intervention session workload rating",
          width: 8,
          view: ratingByHubView,
          load: (filters) => averageRatingByHub(interventionSessionRating.workloadRating, filters),
        },
        {
          metabaseCardId: 4688,
          title: "Average of intervention session student behavior rating",
          width: 8,
          view: ratingByHubView,
          load: (filters) =>
            averageRatingByHub(interventionSessionRating.studentBehaviorRating, filters),
        },
        {
          metabaseCardId: 4633,
          title: "Average School Admin Rating per session per hub",
          width: 24,
          view: ratingPerSessionPerHubView,
          load: (filters) =>
            averageRatingPerSessionPerHub(interventionSessionRating.adminSupportRating, filters),
        },
        {
          metabaseCardId: 4736,
          title: "Average Workload Rating per session per hub",
          width: 24,
          view: ratingPerSessionPerHubView,
          load: (filters) =>
            averageRatingPerSessionPerHub(interventionSessionRating.workloadRating, filters),
        },
        {
          metabaseCardId: 4676,
          title: "Average Student Behavior Rating per session per hub",
          width: 24,
          view: ratingPerSessionPerHubView,
          load: (filters) =>
            averageRatingPerSessionPerHub(interventionSessionRating.studentBehaviorRating, filters),
        },
      ],
    },
  ],
};
