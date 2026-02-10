import jwt from "jsonwebtoken";
import { currentSupervisor } from "#/app/auth";

const METABASE_SITE_URL = "https://dash.shamiri.institute";
const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;

function getMetabaseDashboardId(): number | null {
  const raw = process.env.METABASE_MONITORING_DASHBOARD_ID ?? "";
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id) || id < 1) return null;
  return id;
}

export default async function MonitoringAndEvaluationPage() {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    return <div>Access denied</div>;
  }

  const profile = supervisor.profile;
  if (!profile?.hub) {
    return <div>Configuration error: Supervisor hub not found</div>;
  }

  if (!METABASE_SECRET_KEY) {
    return <div>Configuration error: Metabase secret key not found</div>;
  }

  const dashboardId = getMetabaseDashboardId();
  if (dashboardId === null) {
    return (
      <div>Configuration error: Metabase monitoring dashboard ID not found or invalid</div>
    );
  }

  const payload = {
    resource: { dashboard: dashboardId },
    params: {
      hub: [profile.hub.hubName],
      supervisor: [profile.supervisorName],
    },
    exp: Math.round(Date.now() / 1000) + 10 * 60, // 10 minute expiration
  };
  const token = jwt.sign(payload, METABASE_SECRET_KEY);

  const iframeUrl = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;
  return (
    <div className="h-full w-full">
      <iframe
        src={iframeUrl}
        className="h-full w-full border-0"
        allowTransparency
        title="Monitoring and Evaluation"
      />
    </div>
  );
}
