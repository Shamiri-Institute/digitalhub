import { eq } from "drizzle-orm";

import SupervisorsDataTable from "#/components/common/supervisor/supervisors-datatable";
import { db } from "#/db/client";
import type { ImplementerRole } from "#/db/enums";
import { school } from "#/db/schema";

export default async function SchoolSupervisorsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
  const schoolRow = await db.query.school.findFirst({
    where: (s, { eq }) => eq(s.visibleId, visibleId),
    with: { interventionSessions: { with: { session: true } } },
  });

  const supervisors = await db.query.supervisor.findMany({
    where: (s, { eq }) => eq(s.hubId, schoolRow?.hubId ?? ""),
    with: {
      assignedSchools: true,
      fellows: true,
      supervisorAttendances: {
        where: (a, { inArray }) =>
          inArray(
            a.schoolId,
            db.select({ id: school.id }).from(school).where(eq(school.visibleId, visibleId)),
          ),
        with: { session: true },
      },
      monthlySupervisorEvaluation: true,
    },
    orderBy: (s, { asc }) => asc(s.supervisorName),
  });

  return <SupervisorsDataTable supervisors={supervisors} role={role} school={schoolRow ?? null} />;
}
