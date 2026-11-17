import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";

import { isCronRequest } from "#/lib/auth/cron";
import { runQueuedRatings } from "#/lib/fidelity-rating/worker";
import { runQueuedTranscriptions } from "#/lib/transcription/worker";

export const maxDuration = 800;

/**
 * Transcribes queued recordings and rates queued transcripts. Vercel Cron calls this every minute
 * (vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Preview calls are manual, so only production check-ins: Sentry alerts when a minute's check-in
  // is missed (cron blocked, wrong secret, bad deploy), the worker throws, or it runs past 15 min.
  const runQueued = () => Promise.all([runQueuedTranscriptions(), runQueuedRatings()]);
  const [claimed, rated] =
    process.env.VERCEL_ENV === "production"
      ? await Sentry.withMonitor("transcription-worker", runQueued, {
          schedule: { type: "crontab", value: "* * * * *" },
          checkinMargin: 2,
          maxRuntime: 15,
        })
      : await runQueued();
  return NextResponse.json({ claimed, rated });
}
