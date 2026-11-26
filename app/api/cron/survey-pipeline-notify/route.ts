import * as Sentry from "@sentry/nextjs";

import { isCronRequest } from "#/lib/auth/cron";
import { notifyPipeline } from "#/lib/survey/pipeline-notify";

// Sends time out after 10 s and run together, so a run takes well under this.
export const maxDuration = 60;

/** Called every minute by Vercel Cron (vercel.json), so a scan reaches the pipeline within a minute. */
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return new Response(null, { status: 401 });
  }
  // Production only, as on the print-files cron: Sentry alerts when a minute's check-in is missed
  // or a run throws.
  const notified =
    process.env.VERCEL_ENV === "production"
      ? await Sentry.withMonitor("survey-pipeline-notify", () => notifyPipeline(), {
          schedule: { type: "crontab", value: "* * * * *" },
          checkinMargin: 2,
          maxRuntime: 2,
        })
      : await notifyPipeline();
  return Response.json(notified);
}
