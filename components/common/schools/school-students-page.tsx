import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import StudentsDatatable from "#/components/common/student/students-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { clinicalSessionAttendance, school } from "#/db/schema";
import { countOf } from "#/db/sql";
import { visibleSchoolIds } from "#/lib/auth/require-hub-role";

export default async function SchoolStudentsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
  // The school subtree is identical for every student, so it is loaded once and attached
  // in JS. Nesting it under each row made Drizzle recompute the lateral join per student.
  const visibleSchools = await visibleSchoolIds();
  const [schoolRow, rows] = await Promise.all([
    db.query.school.findFirst({
      where: (s, { and, eq, inArray }) =>
        and(eq(s.visibleId, visibleId), inArray(s.id, visibleSchools.ids)),
      with: { interventionSessions: { with: { session: true } } },
    }),
    db.query.student.findMany({
      where: (s, { and, isNull, inArray }) =>
        and(
          isNull(s.archivedAt),
          inArray(
            s.schoolId,
            db
              .select({ id: school.id })
              .from(school)
              .where(and(eq(school.visibleId, visibleId), inArray(school.id, visibleSchools.ids))),
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
    }),
  ]);

  if (!schoolRow) {
    notFound();
  }
  const students = rows.map((s) => ({ ...s, school: schoolRow }));

  return <StudentsDatatable students={students} role={role} />;
}
