import type { ImplementerRole } from "@prisma/client";
import SupervisorsDataTable from "#/components/common/supervisor/supervisors-datatable";
import { db } from "#/lib/db";

export default async function SchoolSupervisorsPage({
  visibleId,
  role,
}: {
  visibleId: string;
  role: ImplementerRole;
}) {
  const school = await db.school.findUnique({
    where: {
      visibleId,
    },
    include: {
      interventionSessions: {
        include: {
          session: true,
        },
      },
    },
  });

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: school?.hubId ?? "",
    },
    include: {
      assignedSchools: true,
      fellows: true,
      supervisorAttendances: {
        include: {
          session: true,
        },
        where: {
          school: {
            visibleId,
          },
        },
      },
      monthlySupervisorEvaluation: true,
    },
    orderBy: {
      supervisorName: "asc",
    },
  });

  return <SupervisorsDataTable supervisors={supervisors} role={role} school={school ?? null} />;
}
