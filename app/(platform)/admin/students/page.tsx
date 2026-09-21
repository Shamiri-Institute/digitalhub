import { and, count, eq, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { signOut } from "next-auth/react";

import { currentAdminUser } from "#/app/auth";
import HubStudentClinicalDataCharts from "#/components/charts/student-clinical-charts";
import HubStudentDemographicsCharts from "#/components/charts/student-demographics-charts";
import HubStudentsDetailsCharts from "#/components/charts/students-charts";
import StudentsStats from "#/components/students-stats";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import {
  clinicalLead,
  clinicalScreeningInfo,
  clinicalSessionAttendance,
  hub,
  interventionSession,
  school,
  student,
  supervisor,
} from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";

export default async function StudentsPage() {
  const admin = await currentAdminUser();
  if (!admin) {
    await signOut({ callbackUrl: "/login" });
  }
  const projectId = await getActiveProjectId();

  const projectHubIds = db.select({ id: hub.id }).from(hub).where(eq(hub.projectId, projectId));
  const projectSchoolIds = db
    .select({ id: school.id })
    .from(school)
    .where(inArray(school.hubId, projectHubIds));
  // Cases handled by a supervisor or a clinical lead of a hub in the project.
  const projectCaseFilter = or(
    inArray(
      clinicalScreeningInfo.currentSupervisorId,
      db
        .select({ id: supervisor.id })
        .from(supervisor)
        .where(inArray(supervisor.hubId, projectHubIds)),
    ),
    inArray(
      clinicalScreeningInfo.clinicalLeadId,
      db
        .select({ id: clinicalLead.id })
        .from(clinicalLead)
        .where(inArray(clinicalLead.assignedHubId, projectHubIds)),
    ),
  );
  const projectCaseIds = db
    .select({ id: clinicalScreeningInfo.id })
    .from(clinicalScreeningInfo)
    .where(projectCaseFilter);
  const activeProjectStudentFilter = and(
    isNull(student.archivedAt),
    inArray(student.schoolId, projectSchoolIds),
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
    studentAttendanceBySessionType,
    studentsDropOutReasonsGroupedByReason,
    incompleteStudentCount,
    studentGroupRatingsRaw,
  ] = await Promise.all([
    db.$count(student, activeProjectStudentFilter),
    db.$count(interventionSession, eq(interventionSession.projectId, projectId)),
    db.query.clinicalScreeningInfo.findMany({ where: () => projectCaseFilter }),
    db.query.clinicalSessionAttendance.findMany({
      where: (a, { inArray }) => inArray(a.caseId, projectCaseIds),
    }),
    db
      .select({
        session: clinicalSessionAttendance.session,
        count: count(clinicalSessionAttendance.session),
      })
      .from(clinicalSessionAttendance)
      .where(inArray(clinicalSessionAttendance.caseId, projectCaseIds))
      .groupBy(clinicalSessionAttendance.session),
    db
      .select({
        currentSupervisorId: clinicalScreeningInfo.currentSupervisorId,
        count: count(clinicalScreeningInfo.currentSupervisorId),
      })
      .from(clinicalScreeningInfo)
      .where(and(projectCaseFilter, isNotNull(clinicalScreeningInfo.currentSupervisorId)))
      .groupBy(clinicalScreeningInfo.currentSupervisorId),
    db
      .select({
        initialReferredFromSpecified: clinicalScreeningInfo.initialReferredFromSpecified,
        count: count(clinicalScreeningInfo.initialReferredFrom),
      })
      .from(clinicalScreeningInfo)
      .where(projectCaseFilter)
      .groupBy(clinicalScreeningInfo.initialReferredFromSpecified),
    db.query.student.findMany({
      where: () => activeProjectStudentFilter,
      columns: { yearOfBirth: true, age: true, gender: true, form: true },
    }),
    db
      .execute<{ sessionType: string | null; count: number }>(sql`
      SELECT ins.session_type as "sessionType", COUNT(*)::int as count
      FROM student_attendances sa
      JOIN intervention_sessions ins ON ins.id = sa.session_id
      JOIN students s ON s.id = sa.student_id
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE sa.attended = true
        AND s.archived_at IS NULL
        AND h.project_id = ${projectId}
      GROUP BY ins.session_type
    `)
      .then((r) => r.rows),
    db
      .select({ dropOutReason: student.dropOutReason, count: count(student.dropOutReason) })
      .from(student)
      .where(and(activeProjectStudentFilter, eq(student.droppedOut, true)))
      .groupBy(student.dropOutReason),
    db.$count(
      student,
      and(
        activeProjectStudentFilter,
        or(
          isNull(student.studentName),
          isNull(student.gender),
          isNull(student.yearOfBirth),
          isNull(student.form),
        ),
      ),
    ),
    db
      .execute<{ sessionName: string; value: number }>(sql`
      SELECT sn.session_name as "sessionName",
             COALESCE(AVG(isr.student_behavior_rating), 0)::float as value
      FROM intervention_session_ratings isr
      JOIN intervention_sessions ins ON ins.id = isr.session_id
      JOIN session_names sn ON sn.id = ins.session_id
      JOIN hubs h ON sn.hub_id = h.id
      WHERE h.project_id = ${projectId}
        AND isr.student_behavior_rating IS NOT NULL
      GROUP BY sn.session_name
      ORDER BY sn.session_name ASC
    `)
      .then((r) => r.rows),
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
    supervisorName:
      (item.currentSupervisorId && supervisorMap.get(item.currentSupervisorId)) || "Unknown",
    count: item.count,
  }));

  const studentsGroupedByAge: Record<string, number> = {};
  const studentsGroupedByGender: Record<string, number> = {};
  const studentsGroupedByForm: Record<string, number> = {};

  const currentYear = new Date().getFullYear();
  studentAggregations.forEach(({ yearOfBirth, age, gender, form }) => {
    const computedAge = yearOfBirth ? currentYear - yearOfBirth : age;
    if (computedAge)
      studentsGroupedByAge[computedAge] = (studentsGroupedByAge[computedAge] || 0) + 1;
    if (gender) studentsGroupedByGender[gender] = (studentsGroupedByGender[gender] || 0) + 1;
    if (form) studentsGroupedByForm[form] = (studentsGroupedByForm[form] || 0) + 1;
  });

  const studentsAttendanceGroupedBySession = studentAttendanceBySessionType;

  const completePct =
    totalNumberOfStudentsInHub > 0
      ? Math.round(
          ((totalNumberOfStudentsInHub - incompleteStudentCount) / totalNumberOfStudentsInHub) *
            100,
        )
      : 0;
  const studentInfoCompletion = [
    { name: "actual", value: completePct },
    { name: "target", value: 100 - completePct },
  ];

  const studentGroupRatings = studentGroupRatingsRaw.map(({ sessionName, value }) => ({
    session: sessionName,
    value: Number(value),
  }));

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
        studentInfoCompletion={studentInfoCompletion}
        studentGroupRatings={studentGroupRatings}
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
