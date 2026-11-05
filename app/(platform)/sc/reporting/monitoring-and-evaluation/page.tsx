import { currentSupervisor } from "#/app/auth";
import { MonitoringDashboard } from "#/components/common/monitoring/monitoring-dashboard";
import { Alert, AlertTitle } from "#/components/ui/alert";
import type { MonitoringSearchParams } from "#/lib/monitoring/viewer-filters";

export default async function MonitoringAndEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<MonitoringSearchParams>;
}) {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Access denied</AlertTitle>
      </Alert>
    );
  }

  const { id: supervisorId, supervisorName, hubId, hub } = supervisor.profile;
  if (!hub || !hubId) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Configuration error: Supervisor hub not found</AlertTitle>
      </Alert>
    );
  }

  return (
    <MonitoringDashboard
      viewer={{
        role: "supervisor",
        hubId,
        hubName: hub.hubName,
        projectId: hub.projectId,
        supervisorId,
        supervisorName: supervisorName ?? "",
      }}
      searchParams={await searchParams}
    />
  );
}
