import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import HubStudentClinicalDataCharts from "#/components/charts/student-clinical-charts";
import HubStudentDemographicsCharts from "#/components/charts/student-demographics-charts";
import HubStudentsDetailsCharts from "#/components/charts/students-charts";
import StudentsStats from "#/components/students-stats";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { getActiveProjectId } from "#/lib/active-project-id";
import { db } from "#/lib/db";

export default async function StudentsPage() {
  const admin = await currentAdminUser();
  if (!admin) {
    await signOut({ callbackUrl: "/login" });
  }
  const projectId = await getActiveProjectId();

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
    db.student.count({
      where: {
        archivedAt: null,
        school: {
          hub: {
            projectId,
          },
        },
      },
    }),
    db.interventionSession.count({
      where: {
        projectId,
      },
    }),
    db.clinicalScreeningInfo.findMany({
      where: {
        OR: [
          { currentSupervisor: { hub: { projectId } } },
          { clinicalLead: { assignedHub: { projectId } } },
        ],
      },
    }),
    db.clinicalSessionAttendance.findMany({
      where: {
        case: {
          OR: [
            { currentSupervisor: { hub: { projectId } } },
            { clinicalLead: { assignedHub: { projectId } } },
          ],
        },
      },
    }),
    db.clinicalSessionAttendance.groupBy({
      by: ["session"],
      where: {
        case: {
          OR: [
            { currentSupervisor: { hub: { projectId } } },
            { clinicalLead: { assignedHub: { projectId } } },
          ],
        },
      },
      _count: {
        session: true,
      },
    }),
    db.clinicalScreeningInfo.groupBy({
      by: ["currentSupervisorId"],
      where: {
        OR: [
          { currentSupervisor: { hub: { projectId } } },
          { clinicalLead: { assignedHub: { projectId } } },
        ],
        currentSupervisorId: { not: null },
      },
      _count: {
        currentSupervisorId: true,
      },
    }),
    db.clinicalScreeningInfo.groupBy({
      by: ["initialReferredFromSpecified"],
      where: {
        OR: [
          { currentSupervisor: { hub: { projectId } } },
          { clinicalLead: { assignedHub: { projectId } } },
        ],
      },
      _count: {
        initialReferredFrom: true,
      },
    }),
    db.student.findMany({
      where: {
        archivedAt: null,
        school: {
          hub: {
            projectId,
          },
        },
      },
      select: {
        yearOfBirth: true,
        age: true,
        gender: true,
        form: true,
      },
    }),
    db.$queryRaw<{ sessionType: string | null; count: bigint }[]>`
      SELECT ins.session_type as "sessionType", COUNT(*)::bigint as count
      FROM student_attendances sa
      JOIN intervention_sessions ins ON ins.id = sa.session_id
      JOIN students s ON s.id = sa.student_id
      JOIN schools sc ON s.school_id = sc.id
      JOIN hubs h ON sc.hub_id = h.id
      WHERE sa.attended = true
        AND s.archived_at IS NULL
        AND h.project_id = ${projectId}
      GROUP BY ins.session_type
    `,
    db.student.groupBy({
      by: ["dropOutReason"],
      where: {
        archivedAt: null,
        school: {
          hub: {
            projectId,
          },
        },
        droppedOut: true,
      },
      _count: {
        dropOutReason: true,
      },
    }),
    db.student.count({
      where: {
        archivedAt: null,
        school: { hub: { projectId } },
        OR: [{ studentName: null }, { gender: null }, { yearOfBirth: null }, { form: null }],
      },
    }),
    db.$queryRaw<{ sessionName: string; value: number }[]>`
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
    `,
  ]);

  const supervisorIds = hubClinicalSessionsBySupervisor.map((item) => item.currentSupervisorId);

  const supervisors = await db.supervisor.findMany({
    where: {
      id: {
        in: supervisorIds.filter((id): id is string => id !== null),
      },
    },
    select: {
      id: true,
      supervisorName: true,
    },
  });

  const supervisorMap = new Map(supervisors.map((s) => [s.id, s.supervisorName]));

  const clinicalCasesBySupervisors = hubClinicalSessionsBySupervisor.map((item) => ({
    supervisorName:
      (item.currentSupervisorId && supervisorMap.get(item.currentSupervisorId)) || "Unknown",
    count: item._count.currentSupervisorId,
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

  const studentsAttendanceGroupedBySession = studentAttendanceBySessionType.map(
    ({ sessionType, count }) => ({
      sessionType,
      _count: { sessionType: Number(count) },
    }),
  );

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
