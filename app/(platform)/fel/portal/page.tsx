import { sql } from "drizzle-orm";
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
    where: (f, { eq }) => (fellowId === undefined ? sql`false` : eq(f.id, fellowId)),
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
                sql<number>`(select count(*)::int from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`.as(
                  "clinical_cases_count",
                ),
            }),
          },
        },
      },
      supervisor: true,
    },
  });

  // The groups' schools with their sessions, loaded once and attached per group below instead
  // of being recomputed for every group row by a lateral join.
  const schoolIds = [...new Set(fellowRow?.groups.map((g) => g.schoolId) ?? [])];
  const schools =
    schoolIds.length === 0
      ? []
      : await db.query.school.findMany({
          where: (s, { inArray }) => inArray(s.id, schoolIds),
          with: {
            interventionSessions: {
              orderBy: (s, { asc }) => asc(s.sessionDate),
              with: { session: true },
            },
          },
        });
  const schoolById = new Map(schools.map((s) => [s.id, s]));
  const schoolOf = (schoolId: string) => {
    const found = schoolById.get(schoolId);
    if (!found) throw new Error(`School ${schoolId} not found`);
    return found;
  };

  const fellowData = fellowRow
    ? {
        ...fellowRow,
        groups: fellowRow.groups.map((group) => ({ ...group, school: schoolOf(group.schoolId) })),
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
                    numClinicalCases: student.clinicalCasesCount,
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
