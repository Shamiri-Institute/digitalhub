import jwt from "jsonwebtoken";

import { env } from "#/env";

const METABASE_SITE_URL = "https://dash.shamiri.institute";
const EMBED_FRAGMENT = "bordered=true&titled=true";
const TOKEN_EXPIRY_SECONDS = 10 * 60;

export type MetabaseEmbedParams = Record<string, string[]>;

export function getMetabaseEmbedConfig() {
  return {
    secretKey: env.METABASE_SECRET_KEY,
    dashboardId: env.METABASE_MONITORING_DASHBOARD_ID ?? null,
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
