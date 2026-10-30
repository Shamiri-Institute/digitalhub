import { timingSafeEqual } from "node:crypto";

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
  return NextResponse.json({ claimed: await runQueuedTranscriptions() });
}
