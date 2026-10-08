import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";

import SupervisorsDataTable from "#/components/common/supervisor/supervisors-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { school } from "#/db/schema";
import { visibleSchoolIds } from "#/lib/auth/require-hub-role";

export default async function SchoolSupervisorsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
  const visibleSchools = await visibleSchoolIds();
  const schoolHubId = db
    .select({ hubId: school.hubId })
    .from(school)
    .where(and(eq(school.visibleId, visibleId), inArray(school.id, visibleSchools.ids)));

  const [schoolRow, supervisors] = await Promise.all([
    db.query.school.findFirst({
      where: (s, { and, eq, inArray }) =>
        and(eq(s.visibleId, visibleId), inArray(s.id, visibleSchools.ids)),
      with: { interventionSessions: { with: { session: true } } },
    }),
    db.query.supervisor.findMany({
      where: (s, { inArray }) => inArray(s.hubId, schoolHubId),
      columns: {
        id: true,
        supervisorName: true,
        cellNumber: true,
        gender: true,
        archivedAt: true,
        droppedOut: true,
      },
      with: {
        assignedSchools: {
          columns: { schoolName: true },
          orderBy: (assignedSchool, { asc }) => [
            asc(assignedSchool.schoolName),
            asc(assignedSchool.id),
          ],
        },
        fellows: { columns: { droppedOut: true } },
        supervisorAttendances: {
          where: (a, { inArray }) =>
            inArray(
              a.schoolId,
              db.select({ id: school.id }).from(school).where(eq(school.visibleId, visibleId)),
            ),
          columns: {
            id: true,
            supervisorId: true,
            attended: true,
            absenceReason: true,
            absenceComments: true,
            sessionId: true,
          },
          with: { session: { columns: { schoolId: true } } },
        },
      },
      orderBy: (s, { asc }) => asc(s.supervisorName),
    }),
  ]);
  if (!schoolRow) {
    notFound();
  }

  return <SupervisorsDataTable supervisors={supervisors} role={role} school={schoolRow} />;
}
