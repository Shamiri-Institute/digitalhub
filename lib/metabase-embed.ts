import jwt from "jsonwebtoken";

const METABASE_SITE_URL = "https://dash.shamiri.institute";
const EMBED_FRAGMENT = "bordered=true&titled=true";
const TOKEN_EXPIRY_SECONDS = 10 * 60; // 10 minutes

export type MetabaseEmbedParams = Record<string, string[]>;

export function getMetabaseMonitoringDashboardId(): number | null {
  const raw = process.env.METABASE_MONITORING_DASHBOARD_ID ?? "";
  const id = Number.parseInt(raw, 10);
  if (Number.isNaN(id) || id < 1) return null;
  return id;
}

export function getMetabaseEmbedConfig(): {
  secretKey: string | undefined;
  dashboardId: number | null;
} {
  return {
    secretKey: process.env.METABASE_SECRET_KEY,
    dashboardId: getMetabaseMonitoringDashboardId(),
  };
}

export function buildMetabaseDashboardEmbedUrl(
  params: MetabaseEmbedParams,
  dashboardId: number,
  secretKey: string,
): string {
  const payload = {
    resource: { dashboard: dashboardId },
    params,
    exp: Math.round(Date.now() / 1000) + TOKEN_EXPIRY_SECONDS,
  };
  const token = jwt.sign(payload, secretKey);
  return `${METABASE_SITE_URL}/embed/dashboard/${token}#${EMBED_FRAGMENT}`;
}
