import { timingSafeEqual } from "node:crypto";

import * as Sentry from "@sentry/nextjs";
import { type NextRequest, NextResponse } from "next/server";

import { env } from "#/env";
import { runQueuedTranscriptions } from "#/lib/transcription/worker";

export const maxDuration = 800;

/** Vercel Cron calls this every minute (vercel.json) with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: NextRequest) {
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET ?? ""}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    !env.CRON_SECRET ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Preview calls are manual, so only production check-ins: Sentry alerts when a minute's check-in
  // is missed (cron blocked, wrong secret, bad deploy), the worker throws, or it runs past 15 min.
  const claimed =
    process.env.VERCEL_ENV === "production"
      ? await Sentry.withMonitor("transcription-worker", runQueuedTranscriptions, {
          schedule: { type: "crontab", value: "* * * * *" },
          checkinMargin: 2,
          maxRuntime: 15,
        })
      : await runQueuedTranscriptions();
  return NextResponse.json({ claimed });
}
