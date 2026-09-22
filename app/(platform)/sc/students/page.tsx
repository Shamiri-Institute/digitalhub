import { and, count, eq, inArray, isNull, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { signOut } from "next-auth/react";
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
  clinicalSessionAttendance,
  interventionSession,
  school,
  student,
  supervisor,
} from "#/db/schema";

export default async function SupervisorStudentsPage() {
  const current = await currentSupervisor();

  if (!current) {
    redirect("/login");
  }

  const hubId = current.profile.hubId;
  if (!hubId) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }
  const inHub = (col: AnyPgColumn) => eq(col, hubId);
  const hubSchoolIds = db.select({ id: school.id }).from(school).where(inHub(school.hubId));
  const hubSupervisorIds = db
    .select({ id: supervisor.id })
    .from(supervisor)
    .where(inHub(supervisor.hubId));
  const hubCaseFilter = inArray(clinicalScreeningInfo.currentSupervisorId, hubSupervisorIds);
  const hubCaseIds = db
    .select({ id: clinicalScreeningInfo.id })
    .from(clinicalScreeningInfo)
    .where(hubCaseFilter);
  const activeHubStudentFilter = and(
    isNull(student.archivedAt),
    inArray(student.schoolId, hubSchoolIds),
  );

  const [
    _schools, // TODO: use this to provide filter options
    totalNumberOfStudentsInHub,
    totalGroupSessions,
    hubClinicalCases,
    hubClinicalSessions,
    hubClinicalSessionsBySession,
    hubClinicalSessionsBySupervisor,
    hubClinicalSessionsByInitialReferredFrom,
    studentAggregations,
    studentsAttendanceGroupedBySession,
    studentsDropOutReasonsGroupedByReason,
  ] = await Promise.all([
    db.query.school.findMany({ where: (s) => inHub(s.hubId) }),
    db.$count(student, activeHubStudentFilter),
    db.$count(interventionSession, inArray(interventionSession.schoolId, hubSchoolIds)),
    db.query.clinicalScreeningInfo.findMany({
      where: (c, { inArray }) => inArray(c.currentSupervisorId, hubSupervisorIds),
    }),
    db.query.clinicalSessionAttendance.findMany({
      where: (a, { inArray }) => inArray(a.caseId, hubCaseIds),
    }),
    db
      .select({
        session: clinicalSessionAttendance.session,
        count: count(clinicalSessionAttendance.session),
      })
      .from(clinicalSessionAttendance)
      .where(inArray(clinicalSessionAttendance.caseId, hubCaseIds))
      .groupBy(clinicalSessionAttendance.session),
    db
      .select({
        currentSupervisorId: clinicalScreeningInfo.currentSupervisorId,
        count: count(clinicalScreeningInfo.currentSupervisorId),
      })
      .from(clinicalScreeningInfo)
      .where(hubCaseFilter)
      .groupBy(clinicalScreeningInfo.currentSupervisorId),
    db
      .select({
        initialReferredFromSpecified: clinicalScreeningInfo.initialReferredFromSpecified,
        count: count(clinicalScreeningInfo.initialReferredFrom),
      })
      .from(clinicalScreeningInfo)
      .where(or(hubCaseFilter, eq(clinicalScreeningInfo.clinicalLeadId, current.profile.id)))
      .groupBy(clinicalScreeningInfo.initialReferredFromSpecified),
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

  const supervisorIds = hubClinicalSessionsBySupervisor.map((item) => item.currentSupervisorId);

  const supervisors = await db.query.supervisor.findMany({
    where: (s, { inArray }) =>
      inArray(
        s.id,
        supervisorIds.filter((id): id is string => id !== null),
      ),
    columns: { id: true, supervisorName: true },
  });

  const supervisorMap = new Map(supervisors.map((s) => [s.id, s.supervisorName]));

  const clinicalCasesBySupervisors = hubClinicalSessionsBySupervisor.map((item) => ({
    supervisorName: supervisorMap.get(item.currentSupervisorId ?? "") || "Unknown",
    count: item.count,
  }));

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
        hubClinicalCases={hubClinicalCases}
        hubClinicalSessions={hubClinicalSessions}
      />

      <HubStudentsDetailsCharts
        studentsAttendanceGroupedBySession={studentsAttendanceGroupedBySession}
        studentsDropOutReasonsGroupedByReason={studentsDropOutReasonsGroupedByReason}
      />

      <HubStudentClinicalDataCharts
        hubClinicalSessions={hubClinicalSessions}
        hubClinicalCases={hubClinicalCases}
        hubClinicalSessionsBySession={hubClinicalSessionsBySession}
        clinicalCasesBySupervisors={clinicalCasesBySupervisors}
        hubClinicalSessionsByInitialReferredFrom={hubClinicalSessionsByInitialReferredFrom}
      />

      <HubStudentDemographicsCharts
        studentsGroupedByAge={studentsGroupedByAge}
        studentsGroupedByGender={studentsGroupedByGender}
        studentsGroupedByForm={studentsGroupedByForm}
      />

      <PageFooter />
    </>
  );
}
