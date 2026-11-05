import { currentHubCoordinator } from "#/app/auth";
import { MonitoringDashboard } from "#/components/common/monitoring/monitoring-dashboard";
import { Alert, AlertTitle } from "#/components/ui/alert";
import type { MonitoringSearchParams } from "#/lib/monitoring/viewer-filters";

export default async function MonitoringAndEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<MonitoringSearchParams>;
}) {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Access denied</AlertTitle>
      </Alert>
    );
  }

  const assignedHub = hubCoordinator.profile.assignedHub;
  if (!assignedHub) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Configuration error: Hub coordinator hub assignment not found</AlertTitle>
      </Alert>
    );
  }

  return (
    <MonitoringDashboard
      viewer={{
        role: "hub-coordinator",
        hubId: assignedHub.id,
        hubName: assignedHub.hubName,
        projectId: assignedHub.projectId,
      }}
      searchParams={await searchParams}
    />
  );
}
