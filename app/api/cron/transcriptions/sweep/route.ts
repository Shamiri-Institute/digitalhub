import { timingSafeEqual } from "node:crypto";

import { type NextRequest, NextResponse } from "next/server";

import { env } from "#/env";
import { failStaleTranscriptions } from "#/lib/transcription/sweep";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/transcriptions/sweep
 *
 * Vercel Cron (vercel.json) calls this with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(request: NextRequest) {
  const expected = env.CRON_SECRET ? Buffer.from(`Bearer ${env.CRON_SECRET}`) : null;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (!expected || received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const failedRecordingIds = await failStaleTranscriptions();
  if (failedRecordingIds.length > 0) {
    console.warn(
      `Transcription sweep: ${failedRecordingIds.length} stuck transcription(s) marked FAILED`,
      { recordingIds: failedRecordingIds },
    );
  }
  return NextResponse.json({ failedCount: failedRecordingIds.length });
}
