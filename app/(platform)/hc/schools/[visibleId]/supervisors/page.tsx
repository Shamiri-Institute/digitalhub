import SupervisorInfoProvider from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/supervisor-info-provider";
import SupervisorsDataTable from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/supervisors-datatable";
import { currentHubCoordinator } from "#/app/auth";
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
    },
    orderBy: {
      supervisorName: "asc",
    },
  });

  return (
    <SupervisorInfoProvider>
      <SupervisorsDataTable supervisors={supervisors} visibleId={visibleId} />
    </SupervisorInfoProvider>
  );
}
