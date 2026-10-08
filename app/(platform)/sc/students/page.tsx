import { and, count, eq, inArray, isNull } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { redirect } from "next/navigation";

import { currentSupervisor } from "#/app/auth";
import HubStudentClinicalDataCharts from "#/components/charts/student-clinical-charts";
import HubStudentDemographicsCharts from "#/components/charts/student-demographics-charts";
import HubStudentsDetailsCharts from "#/components/charts/students-charts";
import StudentsStats from "#/components/students-stats";
import PageFooter from "#/components/ui/page-footer";
import { db } from "#/db/client";
import {
  clinicalScreeningInfo,
  interventionSession,
  school,
  student,
  supervisor,
} from "#/db/schema";
import { fetchStudentClinicalStats } from "#/lib/actions/clinical/students";

export default async function SupervisorStudentsPage() {
  const current = await currentSupervisor();

  if (!current) {
    redirect("/login");
  }

  const hubId = current.profile.hubId;
  if (!hubId) {
    redirect("/login");
  }
  const inHub = (col: AnyPgColumn) => eq(col, hubId);
  const hubSchoolIds = db.select({ id: school.id }).from(school).where(inHub(school.hubId));
  const hubSupervisorIds = db
    .select({ id: supervisor.id })
    .from(supervisor)
    .where(inHub(supervisor.hubId));
  const hubCaseFilter = inArray(clinicalScreeningInfo.currentSupervisorId, hubSupervisorIds);
  const activeHubStudentFilter = and(
    isNull(student.archivedAt),
    inArray(student.schoolId, hubSchoolIds),
  );

  const [
    clinicalStats,
    studentAggregations,
    studentsAttendanceGroupedBySession,
    studentsDropOutReasonsGroupedByReason,
  ] = await Promise.all([
    fetchStudentClinicalStats(hubCaseFilter),
    db
      .select({
        age: student.age,
        gender: student.gender,
        form: student.form,
        count: count(student.id),
      })
      .from(student)
      .where(activeHubStudentFilter)
      .groupBy(student.age, student.gender, student.form),
    db
      .select({
        sessionType: interventionSession.sessionType,
        count: count(interventionSession.sessionType),
        sessions: count(),
      })
      .from(interventionSession)
      .where(inArray(interventionSession.schoolId, hubSchoolIds))
      .groupBy(interventionSession.sessionType),
    db
      .select({ dropOutReason: student.dropOutReason, count: count(student.dropOutReason) })
      .from(student)
      .where(activeHubStudentFilter)
      .groupBy(student.dropOutReason),
  ]);
  const totalNumberOfStudentsInHub = studentAggregations.reduce((total, g) => total + g.count, 0);
  const totalGroupSessions = studentsAttendanceGroupedBySession.reduce(
    (total, g) => total + g.sessions,
    0,
  );

  const studentsGroupedByAge: Record<string, number> = {};
  const studentsGroupedByGender: Record<string, number> = {};
  const studentsGroupedByForm: Record<string, number> = {};

  studentAggregations.forEach(({ age, gender, form, count }) => {
    if (age) studentsGroupedByAge[age] = count + (studentsGroupedByAge[age] || 0);
    if (gender) studentsGroupedByGender[gender] = count + (studentsGroupedByGender[gender] || 0);
    if (form) studentsGroupedByForm[form] = count + (studentsGroupedByForm[form] || 0);
  });

  return (
    <>
      {/* TODO: this should filter by schools and fellow */}

      <StudentsStats
        totalNumberOfStudentsInHub={totalNumberOfStudentsInHub}
        totalGroupSessions={totalGroupSessions}
        clinicalCaseCount={clinicalStats.caseCount}
        clinicalSessionCount={clinicalStats.sessionCount}
      />

      <HubStudentsDetailsCharts
        studentsAttendanceGroupedBySession={studentsAttendanceGroupedBySession}
        studentsDropOutReasonsGroupedByReason={studentsDropOutReasonsGroupedByReason}
      />

      <HubStudentClinicalDataCharts clinicalStats={clinicalStats} />

      <HubStudentDemographicsCharts
        studentsGroupedByAge={studentsGroupedByAge}
        studentsGroupedByGender={studentsGroupedByGender}
        studentsGroupedByForm={studentsGroupedByForm}
      />

      <PageFooter />
    </>
  );
}
