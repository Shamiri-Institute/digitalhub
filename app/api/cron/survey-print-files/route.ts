import { timingSafeEqual } from "node:crypto";

import { env } from "#/env";
import { drainPrintQueue } from "#/lib/survey/print-files";

// The print queue's lease outlasts this, so a drain that runs to the limit keeps its file.
export const maxDuration = 300;

/** Called every minute by Vercel Cron (vercel.json), so print files render without a visitor. */
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET ?? ""}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    !env.CRON_SECRET ||
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return new Response(null, { status: 401 });
  }
  return Response.json(await drainPrintQueue());
}
