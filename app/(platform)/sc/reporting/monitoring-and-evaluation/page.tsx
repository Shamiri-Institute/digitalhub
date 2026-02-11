import { currentSupervisor } from "#/app/auth";
import MetabaseDashboardEmbed from "#/components/common/metabase-dashboard-embed";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { buildMetabaseDashboardEmbedUrl, getMetabaseEmbedConfig } from "#/lib/metabase-embed";

export default async function MonitoringAndEvaluationPage() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Access denied</AlertTitle>
      </Alert>
    );
  }

  const profile = supervisor.profile;
  if (!profile?.hub) {
    return (
      <Alert variant="destructive" className="mx-4 mt-4">
        <AlertTitle>Configuration error: Supervisor hub not found</AlertTitle>
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
    hub: [profile.hub.hubName],
  };

  const iframeUrl = buildMetabaseDashboardEmbedUrl(params, dashboardId, secretKey);

  return <MetabaseDashboardEmbed iframeUrl={iframeUrl} title="Monitoring and Evaluation" />;
}
