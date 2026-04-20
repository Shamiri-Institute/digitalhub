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
  const implementerId = admin?.session?.user.activeMembership?.implementerId;
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
    studentsAttendanceGroupedBySession,
    studentsDropOutReasonsGroupedByReason,
  ] = await Promise.all([
    db.student.count({
      where: {
        archivedAt: null,
        school: {
          implementerId,
          hub: {
            projectId,
          },
        },
      },
    }),
    db.interventionSession.count({
      where: {
        school: {
          implementerId,
          hub: {
            projectId,
          },
        },
      },
    }),
    db.clinicalScreeningInfo.findMany({
      where: {
        student: {
          archivedAt: null,
          school: {
            implementerId,
            hub: {
              projectId,
            },
          },
        },
      },
    }),
    db.clinicalSessionAttendance.findMany({
      where: {
        case: {
          student: {
            archivedAt: null,
            school: {
              implementerId,
              hub: {
                projectId,
              },
            },
          },
        },
      },
    }),
    db.clinicalSessionAttendance.groupBy({
      by: ["session"],
      where: {
        case: {
          student: {
            archivedAt: null,
            school: {
              implementerId,
              hub: {
                projectId,
              },
            },
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
        student: {
          archivedAt: null,
          school: {
            implementerId,
            hub: {
              projectId,
            },
          },
        },
        currentSupervisorId: { not: null },
      },
      _count: {
        currentSupervisorId: true,
      },
    }),
    db.clinicalScreeningInfo.groupBy({
      by: ["initialReferredFromSpecified"],
      where: {
        student: {
          archivedAt: null,
          school: {
            implementerId,
            hub: {
              projectId,
            },
          },
        },
      },
      _count: {
        initialReferredFrom: true,
      },
    }),
    db.student.findMany({
      where: {
        archivedAt: null,
        school: {
          implementerId,
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
    db.interventionSession.groupBy({
      by: ["sessionType"],
      where: {
        school: {
          implementerId,
          hub: {
            projectId,
          },
        },
      },
      _count: {
        sessionType: true,
      },
    }),
    db.student.groupBy({
      by: ["dropOutReason"],
      where: {
        archivedAt: null,
        school: {
          implementerId,
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
