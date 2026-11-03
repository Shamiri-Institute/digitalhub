import * as Sentry from "@sentry/nextjs";

import { isCronRequest } from "#/lib/auth/cron";
import { drainPrintQueue } from "#/lib/survey/print-files";

// The print queue's lease outlasts this, so a drain that runs to the limit keeps its file.
export const maxDuration = 300;

/** Called every minute by Vercel Cron (vercel.json), so print files render without a visitor. */
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return new Response(null, { status: 401 });
  }
  // Production only, as preview calls are manual: Sentry alerts when a minute's check-in is missed
  // (cron blocked, wrong secret, bad deploy), the drain throws (no bucket), or it runs past 5 min.
  const drained =
    process.env.VERCEL_ENV === "production"
      ? await Sentry.withMonitor("survey-print-files", () => drainPrintQueue(), {
          schedule: { type: "crontab", value: "* * * * *" },
          checkinMargin: 2,
          maxRuntime: 5,
        })
      : await drainPrintQueue();
  return Response.json(drained);
}
