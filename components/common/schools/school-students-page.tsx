import { eq } from "drizzle-orm";

import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { clinicalSessionAttendance, school } from "#/db/schema";
import { countOf } from "#/lib/actions/schedule-data";

export default async function SchoolStudentsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
  const rows = await db.query.student.findMany({
    where: (s, { and, isNull, inArray }) =>
      and(
        isNull(s.archivedAt),
        inArray(
          s.schoolId,
          db.select({ id: school.id }).from(school).where(eq(school.visibleId, visibleId)),
        ),
      ),
    with: {
      clinicalCases: {
        columns: { id: true },
        extras: (c) => ({
          sessionsCount: countOf(clinicalSessionAttendance.caseId, c.id).as("sessions_count"),
        }),
      },
      studentAttendances: {
        with: {
          session: { with: { session: true } },
          group: true,
        },
      },
      assignedGroup: {
        columns: { id: true, groupName: true },
        with: { leader: { columns: { id: true, fellowName: true } } },
      },
      school: {
        with: { interventionSessions: { with: { session: true } } },
      },
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
    orderBy: (s, { desc }) => desc(s.updatedAt),
  });

  // Prisma-shaped `_count` until the student components move off `Prisma.*GetPayload` types.
  const students = rows.map((s) => ({
    ...s,
    clinicalCases: s.clinicalCases.map(({ sessionsCount, ...c }) => ({
      ...c,
      _count: { sessions: sessionsCount },
    })),
  }));

  return <StudentsDatatable students={students} role={role} />;
}
