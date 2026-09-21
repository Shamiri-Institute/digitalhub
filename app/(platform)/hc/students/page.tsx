import { and, count, eq, inArray, isNull, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { currentHubCoordinator } from "#/app/auth";
import HubStudentClinicalDataCharts from "#/components/charts/student-clinical-charts";
import HubStudentDemographicsCharts from "#/components/charts/student-demographics-charts";
import HubStudentsDetailsCharts from "#/components/charts/students-charts";
import StudentsStats from "#/components/students-stats";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import {
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  interventionSession,
  school,
  student,
  supervisor,
} from "#/db/schema";

export default async function StudentsPage() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return (
      <div className="container w-full grow py-10">
        <p>Hub coordinator not found</p>
      </div>
    );
  }

  const hubId = hubCoordinator.profile.assignedHubId;
  // Prisma matched NULL for a null hub id; keep that.
  const inHub = (col: AnyPgColumn) => (hubId === null ? isNull(col) : eq(col, hubId));
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
        n: count(clinicalSessionAttendance.session),
      })
      .from(clinicalSessionAttendance)
      .where(inArray(clinicalSessionAttendance.caseId, hubCaseIds))
      .groupBy(clinicalSessionAttendance.session)
      .then((rows) => rows.map(({ session, n }) => ({ session, _count: { session: n } }))),
    db
      .select({
        currentSupervisorId: clinicalScreeningInfo.currentSupervisorId,
        n: count(clinicalScreeningInfo.currentSupervisorId),
      })
      .from(clinicalScreeningInfo)
      .where(hubCaseFilter)
      .groupBy(clinicalScreeningInfo.currentSupervisorId)
      .then((rows) =>
        rows.map(({ currentSupervisorId, n }) => ({
          currentSupervisorId,
          _count: { currentSupervisorId: n },
        })),
      ),
    db
      .select({
        initialReferredFromSpecified: clinicalScreeningInfo.initialReferredFromSpecified,
        n: count(clinicalScreeningInfo.initialReferredFrom),
      })
      .from(clinicalScreeningInfo)
      .where(
        or(
          hubCaseFilter,
          hubId === null
            ? isNull(clinicalScreeningInfo.clinicalLeadId)
            : eq(clinicalScreeningInfo.clinicalLeadId, hubId),
        ),
      )
      .groupBy(clinicalScreeningInfo.initialReferredFromSpecified)
      .then((rows) =>
        rows.map(({ initialReferredFromSpecified, n }) => ({
          initialReferredFromSpecified,
          _count: { initialReferredFrom: n },
        })),
      ),
    db
      .select({
        age: student.age,
        gender: student.gender,
        form: student.form,
        n: count(student.id),
      })
      .from(student)
      .where(activeHubStudentFilter)
      .groupBy(student.age, student.gender, student.form)
      .then((rows) => rows.map(({ n, ...keys }) => ({ ...keys, _count: { id: n } }))),
    db
      .select({
        sessionType: interventionSession.sessionType,
        n: count(interventionSession.sessionType),
      })
      .from(interventionSession)
      .where(inArray(interventionSession.schoolId, hubSchoolIds))
      .groupBy(interventionSession.sessionType)
      .then((rows) =>
        rows.map(({ sessionType, n }) => ({ sessionType, _count: { sessionType: n } })),
      ),
    db
      .select({ dropOutReason: student.dropOutReason, n: count(student.dropOutReason) })
      .from(student)
      .where(and(activeHubStudentFilter, eq(student.droppedOut, true)))
      .groupBy(student.dropOutReason)
      .then((rows) =>
        rows.map(({ dropOutReason, n }) => ({ dropOutReason, _count: { dropOutReason: n } })),
      ),
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
    count: item._count.currentSupervisorId,
  }));

  const studentsGroupedByAge: Record<string, number> = {};
  const studentsGroupedByGender: Record<string, number> = {};
  const studentsGroupedByForm: Record<string, number> = {};

  studentAggregations.forEach(({ age, gender, form, _count }) => {
    if (age) studentsGroupedByAge[age] = (_count.id || 0) + (studentsGroupedByAge[age] || 0);
    if (gender)
      studentsGroupedByGender[gender] = (_count.id || 0) + (studentsGroupedByGender[gender] || 0);
    if (form) studentsGroupedByForm[form] = (_count.id || 0) + (studentsGroupedByForm[form] || 0);
  });

  /**
   * Non-blocking - To sync with @WendyMbone on two graphs - student info completion and student group ratings.
   */

  return (
    <div className="container w-full grow space-y-3 py-10">
      <PageHeading title="Students" />

      <Separator />

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
    </div>
  );
}
