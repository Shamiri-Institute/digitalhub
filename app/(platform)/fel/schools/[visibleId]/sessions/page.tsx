import { eq } from "drizzle-orm";
import { signOut } from "next-auth/react";

import { currentFellow } from "#/app/auth";
import SessionsDatatable from "#/components/common/session/sessions-datatable";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { school } from "#/db/schema";

export default async function SchoolSessionsPage(props: {
  params: Promise<{ visibleId: string }>;
}) {
  const params = await props.params;

  const { visibleId } = params;

  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }

  const rows = await db.query.interventionSession.findMany({
    where: (s, { inArray }) =>
      inArray(
        s.schoolId,
        db.select({ id: school.id }).from(school).where(eq(school.visibleId, visibleId)),
      ),
    with: {
      hub: { columns: { visibleId: true } },
      school: {
        with: {
          assignedSupervisor: true,
          interventionGroups: {
            with: {
              leader: { columns: { fellowName: true } },
              students: {
                with: { studentAttendances: true },
                extras: (st, { sql }) => ({
                  clinicalCasesCount:
                    sql<number>`(select count(*) from (select student_id from clinical_screening_info) c where c.student_id = ${st.id})`
                      .mapWith(Number)
                      .as("clinical_cases_count"),
                }),
              },
            },
          },
        },
      },
      sessionRatings: true,
      session: true,
    },
  });

  // Readers still use the `_count` shape; flatten it together with them (ENG-2161).
  const sessions = rows.map((s) => ({
    ...s,
    school: s.school
      ? {
          ...s.school,
          interventionGroups: s.school.interventionGroups.map((g) => ({
            ...g,
            students: g.students.map(({ clinicalCasesCount, ...student }) => ({
              ...student,
              _count: { clinicalCases: clinicalCasesCount },
            })),
          })),
        }
      : s.school,
  }));

  return (
    <SessionsDatatable
      sessions={sessions}
      role={fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      fellowId={fellow?.profile?.id}
    />
  );
}
