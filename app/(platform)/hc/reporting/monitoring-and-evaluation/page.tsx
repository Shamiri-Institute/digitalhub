import { currentHubCoordinator } from "#/app/auth";
import MetabaseDashboardEmbed from "#/components/common/metabase-dashboard-embed";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { buildMetabaseDashboardEmbedUrl, getMetabaseEmbedConfig } from "#/lib/metabase-embed";

export default async function MonitoringAndEvaluationPage() {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Access denied</AlertTitle>
      </Alert>
    );
  }

  const profile = hubCoordinator.profile;
  const assignedHub = profile.assignedHub;
  if (!assignedHub) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Configuration error: Hub coordinator hub assignment not found</AlertTitle>
      </Alert>
    );
  }

  const { secretKey, dashboardId } = getMetabaseEmbedConfig();
  if (!secretKey) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Configuration error: Metabase secret key not found</AlertTitle>
      </Alert>
    );
  }
  if (dashboardId === null) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>
          Configuration error: Metabase monitoring dashboard ID not found or invalid
        </AlertTitle>
      </Alert>
    );
  }

  const params = {
    hub: [],
    supervisor: [],
  };
  const iframeUrl = buildMetabaseDashboardEmbedUrl(params, dashboardId, secretKey);

  return <MetabaseDashboardEmbed iframeUrl={iframeUrl} title="Monitoring and Evaluation" />;
}
