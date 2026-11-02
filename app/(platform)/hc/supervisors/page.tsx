import { Suspense } from "react";

import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import SupervisorsTable from "#/app/(platform)/hc/supervisors/components/supervisors-table";
import SupervisorChartsWrapper from "#/app/(platform)/hc/supervisors/components/supervisor-charts-container";
import WeeklyHubTeamMeetingForm from "#/app/(platform)/hc/supervisors/components/weekly-hub-team-meeting";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { redirect } from "next/navigation";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

export default async function SupervisorsPage() {
  const coordinator = await currentHubCoordinator();
  if (!coordinator) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }

  const hubId = coordinator.profile.assignedHubId;
  if (!hubId) {
    redirect("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Supervisors" />
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex gap-3">{/* search filters go here */}</div>
          <div className="flex items-center gap-3">
            <WeeklyHubTeamMeetingForm hubCoordinatorId={coordinator.profile.id} hubId={hubId} />
          </div>
        </div>

        <Suspense fallback={<GraphLoadingIndicator />}>
          <SupervisorChartsWrapper coordinator={{ assignedHubId: hubId }} />
        </Suspense>

        <Separator />

        <SupervisorsTable
          hubId={hubId}
          projectId={coordinator.profile.assignedHub?.projectId ?? null}
          role={coordinator.session.user.activeMembership?.role ?? "HUB_COORDINATOR"}
        />
      </div>
      <PageFooter />
    </div>
  );
}
