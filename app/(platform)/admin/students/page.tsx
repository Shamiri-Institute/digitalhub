import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import HubStudentClinicalDataCharts from "#/components/charts/student-clinical-charts";
import HubStudentDemographicsCharts from "#/components/charts/student-demographics-charts";
import HubStudentsDetailsCharts from "#/components/charts/students-charts";
import StudentsStats from "#/components/students-stats";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

export default async function StudentsPage() {
  const admin = await currentAdminUser();
  if (!admin) {
    await signOut({ callbackUrl: "/login" });
  }
  const implementerId = admin?.session?.user.activeMembership?.implementerId;

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
    db.student.count({
      where: {
        school: {
          implementerId,
        },
      },
    }),
    db.interventionSession.count({
      where: {
        school: {
          implementerId,
        },
      },
    }),
    db.clinicalScreeningInfo.findMany({
      where: {
        currentSupervisor: {
          implementerId,
        },
      },
    }),
    db.clinicalSessionAttendance.findMany({
      where: {
        case: {
          currentSupervisor: {
            implementerId,
          },
        },
      },
    }),
    db.clinicalSessionAttendance.groupBy({
      by: ["session"],
      where: {
        case: {
          currentSupervisor: {
            implementerId,
          },
        },
      },
      _count: {
        session: true,
      },
    }),
    db.clinicalScreeningInfo.groupBy({
      by: ["currentSupervisorId"],
      where: {
        currentSupervisor: {
          implementerId,
        },
      },
      _count: {
        currentSupervisorId: true,
      },
    }),
    db.clinicalScreeningInfo.groupBy({
      by: ["initialReferredFromSpecified"],
      where: {
        OR: [
          {
            currentSupervisor: {
              implementerId,
            },
          },
          {
            clinicalLeadId: implementerId,
          },
        ],
      },
      _count: {
        initialReferredFrom: true,
      },
    }),
    db.student.groupBy({
      by: ["age", "gender", "form"],
      where: {
        school: {
          implementerId,
        },
      },
      _count: {
        id: true,
      },
    }),
    db.interventionSession.groupBy({
      by: ["sessionType"],
      where: {
        school: {
          implementerId,
        },
      },
      _count: {
        sessionType: true,
      },
    }),
    db.student.groupBy({
      by: ["dropOutReason"],
      where: {
        school: {
          implementerId,
        },
        droppedOut: true,
      },
      _count: {
        dropOutReason: true,
      },
    }),
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
