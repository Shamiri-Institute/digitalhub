import { notFound } from "next/navigation";

import StudentsDatatable from "#/components/common/student/students-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { clinicalSessionAttendance } from "#/db/schema";
import { countOf } from "#/db/sql";
import { visibleSchoolIds } from "#/lib/auth/require-hub-role";

async function loadTransferSchools(role: ImplementerRole) {
  if (role !== ImplementerRole.HUB_COORDINATOR) {
    return [];
  }
  const hubId = (await currentHubCoordinator())?.profile?.assignedHubId;
  if (!hubId) {
    return [];
  }
  return db.query.school.findMany({
    where: (s, { and, eq, isNull }) => and(eq(s.hubId, hubId), isNull(s.archivedAt)),
    columns: { id: true, schoolName: true, visibleId: true },
    orderBy: (s, { asc }) => asc(s.schoolName),
  });
}

export type TransferSchool = Awaited<ReturnType<typeof loadTransferSchools>>[number];

export default async function SchoolStudentsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
  const visibleSchools = await visibleSchoolIds();
  const schoolRow = await db.query.school.findFirst({
    where: (s, { and, eq, inArray }) =>
      and(eq(s.visibleId, visibleId), inArray(s.id, visibleSchools.ids)),
    with: { interventionSessions: { with: { session: true } } },
  });
  if (!schoolRow) {
    notFound();
  }
  const [rows, transferSchools] = await Promise.all([
    db.query.student.findMany({
      where: (s, { and, eq, isNull }) => and(isNull(s.archivedAt), eq(s.schoolId, schoolRow.id)),
      with: {
        clinicalCases: {
          columns: { id: true },
          extras: (c) => ({
            sessionsCount: countOf(clinicalSessionAttendance.caseId, c.id).as("sessions_count"),
          }),
        },
        studentAttendances: {
          columns: {
            id: true,
            studentId: true,
            attended: true,
            absenceReason: true,
            comments: true,
            sessionId: true,
          },
          with: {
            session: {
              columns: { sessionDate: true },
              with: { session: { columns: { sessionName: true } } },
            },
            group: { columns: { groupName: true } },
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
    loadTransferSchools(role),
  ]);
  const students = rows.map((s) => ({ ...s, school: schoolRow }));

  return <StudentsDatatable students={students} role={role} transferSchools={transferSchools} />;
}
