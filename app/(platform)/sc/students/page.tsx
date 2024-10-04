import { currentSupervisor } from "#/app/auth";
import HubStudentClinicalDataCharts from "#/components/charts/student-clinical-charts";
import HubStudentDemographicsCharts from "#/components/charts/student-demographics-charts";
import HubStudentsDetailsCharts from "#/components/charts/students-charts";
import StudentsFilterTab from "#/components/students-filter-tab";
import StudentsStats from "#/components/students-stats";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";
import { redirect } from "next/navigation";

export default async function SupervisorStudentsPage({
  searchParams,
}: {
  searchParams: Record<"fellowId" | "schoolId", string>;
}) {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    redirect("/login");
  }

  const [
    schools,
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
    db.school.findMany({
      where: {
        hubId: supervisor.hubId,
      },
    }),
    db.student.count({
      where: {
        school: {
          hubId: supervisor.hubId,
        },
      },
    }),
    db.interventionSession.count({
      where: {
        school: {
          hubId: supervisor.hubId,
        },
      },
    }),
    db.clinicalScreeningInfo.findMany({
      where: {
        currentSupervisor: {
          hubId: supervisor.hubId,
        },
      },
    }),
    db.clinicalSessionAttendance.findMany({
      where: {
        case: {
          currentSupervisor: {
            hubId: supervisor.hubId,
          },
        },
      },
    }),
    db.clinicalSessionAttendance.groupBy({
      by: ["session"],
      where: {
        case: {
          currentSupervisor: {
            hubId: supervisor.hubId,
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
          hubId: supervisor.hubId,
        },
      },
      _count: {
        currentSupervisorId: true,
      },
    }),
    db.clinicalScreeningInfo.groupBy({
      by: ["initialReferredFrom"],
      where: {
        currentSupervisor: {
          hubId: supervisor.hubId,
        },
      },
      _count: {
        initialReferredFrom: true,
      },
    }),
    db.student.groupBy({
      by: ["age", "gender", "form"],
      where: {
        school: {
          hubId: supervisor.hubId,
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
          hubId: supervisor.hubId,
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
          hubId: supervisor.hubId,
        },
      },
      _count: {
        dropOutReason: true,
      },
    }),
  ]);

  const supervisorIds = hubClinicalSessionsBySupervisor.map(
    (item) => item.currentSupervisorId,
  );

  const supervisors = await db.supervisor.findMany({
    where: {
      id: {
        in: supervisorIds,
      },
    },
    select: {
      id: true,
      supervisorName: true,
    },
  });

  const supervisorMap = new Map(
    supervisors.map((s) => [s.id, s.supervisorName]),
  );

  const clinicalCasesBySupervisors = hubClinicalSessionsBySupervisor.map(
    (item) => ({
      supervisorName: supervisorMap.get(item.currentSupervisorId) || "Unknown",
      count: item._count.currentSupervisorId,
    }),
  );

  const studentsGroupedByAge: Record<string, number> = {};
  const studentsGroupedByGender: Record<string, number> = {};
  const studentsGroupedByForm: Record<string, number> = {};

  studentAggregations.forEach(({ age, gender, form, _count }) => {
    if (age)
      studentsGroupedByAge[age] =
        (_count.id || 0) + (studentsGroupedByAge[age] || 0);
    if (gender)
      studentsGroupedByGender[gender] =
        (_count.id || 0) + (studentsGroupedByGender[gender] || 0);
    if (form)
      studentsGroupedByForm[form] =
        (_count.id || 0) + (studentsGroupedByForm[form] || 0);
  });

  /**
   * Non-blocking - To sync with @WendyMbone on two graphs - student info completion and student group ratings.
   */

  return (
    <div className="container w-full grow space-y-3 py-10">
      <PageHeading title="Students" />

      <Separator />

      {/*TODO: what's happening here? */}
      <StudentsFilterTab hubCoordinatorId={supervisor.id} />

      <StudentsStats
        totalNumberOfStudentsInHub={totalNumberOfStudentsInHub}
        totalGroupSessions={totalGroupSessions}
        hubClinicalCases={hubClinicalCases}
        hubClinicalSessions={hubClinicalSessions}
      />

      <HubStudentsDetailsCharts
        studentsAttendanceGroupedBySession={studentsAttendanceGroupedBySession}
        studentsDropOutReasonsGroupedByReason={
          studentsDropOutReasonsGroupedByReason
        }
      />

      <HubStudentClinicalDataCharts
        hubClinicalSessions={hubClinicalSessions}
        hubClinicalCases={hubClinicalCases}
        hubClinicalSessionsBySession={hubClinicalSessionsBySession}
        clinicalCasesBySupervisors={clinicalCasesBySupervisors}
        hubClinicalSessionsByInitialReferredFrom={
          hubClinicalSessionsByInitialReferredFrom
        }
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
