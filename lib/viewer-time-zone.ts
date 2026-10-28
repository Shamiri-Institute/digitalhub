import "server-only";

import { cookies } from "next/headers";

import { TIME_ZONE_COOKIE } from "#/lib/schedule-view";

/**
 * The viewer's IANA time zone, which `ViewerTimeZoneCookie` sets from the browser. Null until it
 * has: render without dates and times then, never in a fixed zone.
 */
export async function viewerTimeZone() {
  const timeZone = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  if (!timeZone) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return timeZone;
  } catch {
    return null;
  }
}
