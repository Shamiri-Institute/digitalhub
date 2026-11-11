import * as Sentry from "@sentry/nextjs";

import { isCronRequest } from "#/lib/auth/cron";
import { closeExpiredTickets } from "#/lib/close-expired-tickets";

/** Called hourly by Vercel Cron (vercel.json); reopening is refused past the window regardless. */
export async function GET(request: Request) {
  if (!isCronRequest(request)) {
    return new Response(null, { status: 401 });
  }
  // Production only, as preview calls are manual: Sentry alerts when an hour's check-in is missed.
  const closed =
    process.env.VERCEL_ENV === "production"
      ? await Sentry.withMonitor("close-tickets", () => closeExpiredTickets(), {
          schedule: { type: "crontab", value: "0 * * * *" },
          checkinMargin: 10,
          maxRuntime: 5,
        })
      : await closeExpiredTickets();
  return Response.json({ closed });
}
