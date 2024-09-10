import HubStudentClinicalDataCharts from "#/app/(platform)/hc/students/components/charts/student-clinical-charts";
import HubStudentDemographicsCharts from "#/app/(platform)/hc/students/components/charts/student-demographics-charts";
import HubStudentsDetailsCharts from "#/app/(platform)/hc/students/components/charts/students-charts";
import StudentsFilterTab from "#/app/(platform)/hc/students/components/students-filter-tab";
import StudentsStats from "#/app/(platform)/hc/students/components/students-stats";
import { currentHubCoordinator } from "#/app/auth";
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

  const totalNumberOfStudentsInHub = await db.student.count({
    where: {
      school: {
        hubId: hubCoordinator?.assignedHubId,
      },
    },
  });

  const totalGroupSessions = await db.interventionSession.count({
    where: {
      school: {
        hubId: hubCoordinator?.assignedHubId,
      },
    },
  });

  const hubClinicalCases = await db.clinicalScreeningInfo.findMany({
    where: {
      currentSupervisor: {
        hubId: hubCoordinator?.assignedHubId,
      },
    },
  });

  const hubClinicalSessions = await db.clinicalSessionAttendance.findMany({
    where: {
      case: {
        currentSupervisor: {
          hubId: hubCoordinator?.assignedHubId,
        },
      },
    },
  });

  const hubClinicalSessionsBySession =
    await db.clinicalSessionAttendance.groupBy({
      by: ["session"],
      where: {
        case: {
          currentSupervisor: {
            hubId: hubCoordinator?.assignedHubId,
          },
        },
      },
      _count: {
        session: true,
      },
    });

  const hubClinicalSessionsBySupervisor =
    await db.clinicalScreeningInfo.groupBy({
      by: ["currentSupervisorId"],
      where: {
        currentSupervisor: {
          hubId: hubCoordinator?.assignedHubId,
        },
      },
      _count: {
        currentSupervisorId: true,
      },
    });

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

  const hubClinicalSessionsByInitialReferredFrom =
    await db.clinicalScreeningInfo.groupBy({
      by: ["initialReferredFrom"],
      where: {
        currentSupervisor: {
          hubId: hubCoordinator?.assignedHubId,
        },
      },
      _count: {
        initialReferredFrom: true,
      },
    });

  const studentsGroupedByAge = await db.student.groupBy({
    by: ["age"],
    where: {
      school: {
        hubId: hubCoordinator?.assignedHubId,
      },
    },
    _count: {
      age: true,
    },
  });

  const studentsGroupedByGender = await db.student.groupBy({
    by: ["gender"],
    where: {
      school: {
        hubId: hubCoordinator?.assignedHubId,
      },
    },
    _count: {
      gender: true,
    },
  });

  const studentsGroupedByForm = await db.student.groupBy({
    by: ["form"],
    where: {
      school: {
        hubId: hubCoordinator?.assignedHubId,
      },
    },
    _count: {
      form: true,
    },
  });

  const studentsAttendanceGroupedBySession =
    await db.interventionSession.groupBy({
      by: ["sessionType"],
      where: {
        school: {
          hubId: hubCoordinator?.assignedHubId,
        },
      },
      _count: {
        sessionType: true,
      },
    });

  const studentsDropOutReasonsGroupedByReason = await db.student.groupBy({
    by: ["dropOutReason"],
    where: {
      school: {
        hubId: hubCoordinator?.assignedHubId,
      },
    },
    _count: {
      dropOutReason: true,
    },
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
