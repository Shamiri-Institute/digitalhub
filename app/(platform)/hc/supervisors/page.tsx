import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";

import AllSupervisorsDataTable from "#/app/(platform)/hc/supervisors/components/all-supervisors-datatable";
import SupervisorProvider from "#/app/(platform)/hc/supervisors/components/supervisor-provider";
import { currentHubCoordinator } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/lib/db";

export default async function SupervisorsPage() {
  const coordinator = await currentHubCoordinator();
  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: coordinator?.assignedHubId,
    },
    include: {
      assignedSchools: true,
      fellows: true,
    },
    orderBy: {
      supervisorName: "asc",
    },
  });

  if (!coordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  if (!coordinator.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Supervisors" />
        <Separator />
        <SupervisorProvider>
          <AllSupervisorsDataTable supervisors={supervisors} />
        </SupervisorProvider>
      </div>
      <PageFooter />
    </div>
  );
}
