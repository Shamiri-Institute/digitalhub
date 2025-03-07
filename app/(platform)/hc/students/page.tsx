import { currentHubCoordinator } from "#/app/auth";
import HubStudentClinicalDataCharts from "#/components/charts/student-clinical-charts";
import HubStudentDemographicsCharts from "#/components/charts/student-demographics-charts";
import HubStudentsDetailsCharts from "#/components/charts/students-charts";
import StudentsFilterTab from "#/components/students-filter-tab";
import StudentsStats from "#/components/students-stats";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

export default async function StudentsPage() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return (
      <div className="container w-full grow py-10">
        <p>Hub coordinator not found</p>
      </div>
    );
  }

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
          hubId: hubCoordinator.assignedHubId,
        },
      },
    }),
    db.interventionSession.count({
      where: {
        school: {
          hubId: hubCoordinator.assignedHubId,
        },
      },
    }),
    db.clinicalScreeningInfo.findMany({
      where: {
        currentSupervisor: {
          hubId: hubCoordinator.assignedHubId,
        },
      },
    }),
    db.clinicalSessionAttendance.findMany({
      where: {
        case: {
          currentSupervisor: {
            hubId: hubCoordinator.assignedHubId,
          },
        },
      },
    }),
    db.clinicalSessionAttendance.groupBy({
      by: ["session"],
      where: {
        case: {
          currentSupervisor: {
            hubId: hubCoordinator.assignedHubId,
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
          hubId: hubCoordinator.assignedHubId,
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
          hubId: hubCoordinator.assignedHubId,
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
          hubId: hubCoordinator.assignedHubId,
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
          hubId: hubCoordinator.assignedHubId,
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
          hubId: hubCoordinator.assignedHubId,
        },
        droppedOut: true,
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

      <StudentsFilterTab hubCoordinatorId={hubCoordinator.id} />

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
