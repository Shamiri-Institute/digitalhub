import type { FellowsData } from "#/app/(platform)/sc/actions";
import { currentFellow } from "#/app/auth";
import FellowSchoolsDatatable from "#/components/common/fellow/fellow-schools-datatable";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { CURRENT_PROJECT_ID } from "#/lib/constants";
import { db } from "#/lib/db";
import { signOut } from "next-auth/react";

export default async function FellowsPage() {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const fellowData = await db.fellow.findFirst({
    where: {
      id: fellow?.id,
    },
    include: {
      fellowAttendances: {
        include: {
          session: {
            include: {
              session: true,
              school: true,
            },
          },
          group: true,
          PayoutStatements: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
      weeklyFellowRatings: true,
      groups: {
        include: {
          interventionGroupReports: {
            include: {
              session: true,
            },
          },
          students: {
            include: {
              clinicalCases: true,
              _count: {
                select: {
                  clinicalCases: true,
                },
              },
            },
          },
          school: {
            include: {
              interventionSessions: {
                orderBy: {
                  sessionDate: "asc",
                },
                include: {
                  session: true,
                },
              },
            },
          },
        },
      },
      supervisor: true,
    },
  });

  const project = await db.project.findUnique({
    where: {
      id: CURRENT_PROJECT_ID,
    },
  });

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellow Portal" />
        <Separator />
        <FellowSchoolsDatatable
          fellows={[
            {
              ...fellowData,
              supervisorName: fellowData?.supervisor?.supervisorName ?? null,
              supervisors: [],
              sessions:
                fellowData?.groups.map((group) => ({
                  schoolName: group.school?.schoolName,
                  sessionType:
                    group.school?.interventionSessions[0]?.sessionDate &&
                    group.school?.interventionSessions[0]?.sessionDate >
                      new Date()
                      ? group.school?.interventionSessions[0]?.sessionType
                      : "No upcoming session",
                  groupName: group.groupName,
                  numberOfStudents: group.students.length,
                  students: group.students.map((student) => ({
                    ...student,
                    numClinicalCases: student.clinicalCases.length,
                  })),
                })) ?? [],
              attendances: fellowData?.fellowAttendances ?? [],
              groups:
                fellowData?.groups.map((group) => {
                  return {
                    ...group,
                    attendances: fellowData?.fellowAttendances.filter(
                      (attendance) => {
                        return attendance.groupId === group.id;
                      },
                    ),
                  };
                }) ?? [],
              complaints: [],
              averageRating: 0,
            } as FellowsData,
          ]}
          project={project ?? undefined}
          role={fellow!.user.membership.role}
        />
      </div>
      <PageFooter />
    </div>
  );
}
