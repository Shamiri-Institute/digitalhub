import { timingSafeEqual } from "node:crypto";

import { env } from "#/env";

/** Whether the request carries Vercel Cron's `Authorization: Bearer $CRON_SECRET`; never while it's unset. */
export function isCronRequest(request: Request) {
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET ?? ""}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  return (
    !!env.CRON_SECRET && received.length === expected.length && timingSafeEqual(received, expected)
  );
}
