import { currentHubCoordinator } from "#/app/auth";
import SupervisorsDataTable from "#/components/common/supervisor/supervisors-datatable";
import { db } from "#/lib/db";

export default async function SupervisorsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const coordinator = await currentHubCoordinator();
  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: coordinator?.assignedHubId,
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
  const school = await db.school.findUnique({
    where: {
      visibleId,
    },
    include: {
      interventionSessions: true,
    },
  });
  return (
    <SupervisorsDataTable
      supervisors={supervisors}
      visibleId={visibleId}
      role={coordinator?.user.membership.role!}
      school={school ?? null}
    />
  );
}
