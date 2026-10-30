import { env } from "#/env";
import { drainPrintQueue } from "#/lib/survey/print-files";

// The print queue's lease outlasts this, so a drain that runs to the limit keeps its file.
export const maxDuration = 300;

/** Called every minute by Vercel Cron (vercel.json), so print files render without a visitor. */
export async function GET(request: Request) {
  if (!env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return new Response(null, { status: 401 });
  }
  return Response.json(await drainPrintQueue());
}
