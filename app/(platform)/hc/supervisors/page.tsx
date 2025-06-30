import { Suspense } from "react";

import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import MainSupervisorsDataTable from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import SupervisorChartsWrapper from "#/app/(platform)/hc/supervisors/components/supervisor-charts-container";
import SupervisorProvider from "#/app/(platform)/hc/supervisors/components/supervisor-provider";
import WeeklyHubTeamMeetingForm from "#/app/(platform)/hc/supervisors/components/weekly-hub-team-meeting";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
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
      hub: {
        include: {
          project: true,
        },
      },
      monthlySupervisorEvaluation: true,
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
        <div className="flex items-center justify-between">
          <div className="flex gap-3">{/* search filters go here */}</div>
          <div className="flex items-center gap-3">
            <WeeklyHubTeamMeetingForm
              hubCoordinatorId={coordinator?.id!}
              hubId={coordinator?.assignedHubId}
            />
          </div>
        </div>

        <Suspense fallback={<GraphLoadingIndicator />}>
          <SupervisorChartsWrapper coordinator={{ assignedHubId: coordinator?.assignedHubId }} />
        </Suspense>

        <Separator />

        <SupervisorProvider>
          <MainSupervisorsDataTable
            supervisors={supervisors}
            hubId={coordinator.assignedHubId}
            implementerId={coordinator.implementerId!}
            projectId={coordinator.assignedHub?.projectId!}
          />
        </SupervisorProvider>
      </div>
      <PageFooter />
    </div>
  );
}
