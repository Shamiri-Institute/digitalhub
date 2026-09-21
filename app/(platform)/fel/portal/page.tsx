import { signOut } from "next-auth/react";

import type { FellowsData } from "#/app/(platform)/sc/actions";
import { currentFellow } from "#/app/auth";
import FellowSchoolsDatatable from "#/components/common/fellow/fellow-schools-datatable";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";

export default async function FellowsPage() {
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const fellowId = fellow?.profile.id;
  const fellowRow = await db.query.fellow.findFirst({
    // Prisma dropped the filter when the id was undefined; keep that.
    where: (f, { eq }) => (fellowId === undefined ? undefined : eq(f.id, fellowId)),
    with: {
      hub: { with: { project: true } },
      fellowAttendances: {
        with: {
          session: { with: { session: true, school: true } },
          group: true,
          PayoutStatements: { orderBy: (p, { desc }) => desc(p.createdAt) },
        },
      },
      weeklyFellowRatings: true,
      groups: {
        with: {
          interventionGroupReports: { with: { session: true } },
          students: {
            extras: (st, { sql }) => ({
              clinicalCasesCount:
                sql<number>`(select count(*) from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`
                  .mapWith(Number)
                  .as("clinical_cases_count"),
            }),
          },
          school: {
            with: {
              interventionSessions: {
                orderBy: (s, { asc }) => asc(s.sessionDate),
                with: { session: true },
              },
            },
          },
        },
      },
      supervisor: true,
    },
  });

  // Readers still use the `_count` shape; flatten it together with them (ENG-2161).
  const fellowData = fellowRow
    ? {
        ...fellowRow,
        groups: fellowRow.groups.map((group) => ({
          ...group,
          students: group.students.map(({ clinicalCasesCount, ...student }) => ({
            ...student,
            _count: { clinicalCases: clinicalCasesCount },
          })),
        })),
      }
    : null;

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
                    group.school?.interventionSessions[0]?.sessionDate > new Date()
                      ? group.school?.interventionSessions[0]?.sessionType
                      : "No upcoming session",
                  groupName: group.groupName,
                  numberOfStudents: group.students.length,
                  students: group.students.map((student) => ({
                    ...student,
                    numClinicalCases: student._count.clinicalCases,
                  })),
                })) ?? [],
              attendances: fellowData?.fellowAttendances ?? [],
              groups:
                fellowData?.groups.map((group) => {
                  return {
                    ...group,
                    attendances: fellowData?.fellowAttendances.filter((attendance) => {
                      return attendance.groupId === group.id;
                    }),
                  };
                }) ?? [],
              complaints: [],
              averageRating: 0,
            } as FellowsData,
          ]}
          project={fellowData?.hub?.project ?? undefined}
          role={fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
        />
      </div>
      <PageFooter />
    </div>
  );
}
