import { Suspense } from "react";

import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import MainSupervisorsDataTable from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import SupervisorChartsWrapper from "#/app/(platform)/hc/supervisors/components/supervisor-charts-container";
import WeeklyHubTeamMeetingForm from "#/app/(platform)/hc/supervisors/components/weekly-hub-team-meeting";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { db } from "#/db/client";

export default async function SupervisorsPage() {
  const coordinator = await currentHubCoordinator();
  const hubId = coordinator?.profile?.assignedHubId;
  const supervisors = await db.query.supervisor.findMany({
    // Prisma dropped the filter for undefined and matched NULL for null; keep that.
    where: (s, { eq, isNull }) =>
      hubId === undefined ? undefined : hubId === null ? isNull(s.hubId) : eq(s.hubId, hubId),
    with: {
      assignedSchools: true,
      fellows: true,
      hub: { with: { project: true } },
      monthlySupervisorEvaluation: true,
    },
    orderBy: (s, { asc }) => asc(s.supervisorName),
  });

  if (!coordinator) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }

  const assignedHubId = coordinator.profile?.assignedHubId;
  if (!assignedHubId) {
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
              hubCoordinatorId={coordinator?.profile?.id ?? ""}
              hubId={assignedHubId}
            />
          </div>
        </div>

        <Suspense fallback={<GraphLoadingIndicator />}>
          <SupervisorChartsWrapper coordinator={{ assignedHubId }} />
        </Suspense>

        <Separator />

        <MainSupervisorsDataTable
          supervisors={supervisors}
          role={coordinator.session.user.activeMembership?.role ?? "HUB_COORDINATOR"}
        />
      </div>
      <PageFooter />
    </div>
  );
}
