import { and, eq, inArray } from "drizzle-orm";
import { signOut } from "next-auth/react";

import { currentFellow } from "#/app/auth";
import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { interventionGroup, school } from "#/db/schema";

export default async function StudentsPage({ params }: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await params;
  const fellow = await currentFellow();
  if (fellow === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const fellowId = fellow?.profile?.id;

  const schoolIds = db
    .select({ id: school.id })
    .from(school)
    .where(eq(school.visibleId, visibleId));
  // Prisma dropped the leader filter when the fellow id was undefined; keep that.
  const fellowGroupIds = db
    .select({ id: interventionGroup.id })
    .from(interventionGroup)
    .where(
      and(
        fellowId === undefined ? undefined : eq(interventionGroup.leaderId, fellowId),
        inArray(interventionGroup.schoolId, schoolIds),
      ),
    );

  const rows = await db.query.student.findMany({
    where: (st, { and, inArray, isNull }) =>
      and(
        isNull(st.archivedAt),
        inArray(st.schoolId, schoolIds),
        inArray(st.assignedGroupId, fellowGroupIds),
      ),
    with: {
      clinicalCases: {
        columns: { id: true },
        extras: (c, { sql }) => ({
          sessionsCount:
            sql<number>`(select count(*) from (select "caseId" from clinical_session_attendance) a where a."caseId" = ${c.id})`
              .mapWith(Number)
              .as("sessions_count"),
        }),
      },
      studentAttendances: { with: { session: { with: { session: true } }, group: true } },
      assignedGroup: {
        columns: { id: true, groupName: true },
        with: { leader: { columns: { id: true, fellowName: true } } },
      },
      school: { with: { interventionSessions: { with: { session: true } } } },
      studentGroupTransferTrail: {
        columns: {
          id: true,
          createdAt: true,
          updatedAt: true,
          studentId: true,
          currentGroupId: true,
          fromGroupId: true,
        },
        with: {
          fromGroup: {
            columns: { id: true, groupName: true },
            with: { leader: { columns: { id: true, fellowName: true } } },
          },
        },
      },
    },
  });

  // Readers still use the `_count` shape; flatten it together with them (ENG-2161).
  const students = rows.map((st) => ({
    ...st,
    clinicalCases: st.clinicalCases.map(({ sessionsCount, ...c }) => ({
      ...c,
      _count: { sessions: sessionsCount },
    })),
  }));

  return (
    <StudentsDatatable
      students={students}
      role={fellow?.session?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
    />
  );
}
