import { cookies } from "next/headers";
import type { ImplementerRole } from "#/db/enums";
import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
import { parseScheduleView, scheduleRange, TIME_ZONE_COOKIE } from "#/lib/schedule-view";

export type ScheduleSearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The viewer's IANA time zone, which the schedule sets from the browser. Null until it has. */
async function viewerTimeZone() {
  const timeZone = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  if (!timeZone) return null;
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return timeZone;
  } catch {
    return null;
  }
}

/** Starts loading the sessions the URL names; the schedule reads the promise in a Suspense boundary. */
export async function loadScheduleSessions(
  searchParams: ScheduleSearchParams,
  role: ImplementerRole,
) {
  const timeZone = await viewerTimeZone();
  if (!timeZone) return { timeZone, sessions: null };
  const params = await searchParams;
  const view = parseScheduleView(
    (name) => {
      const value = params[name];
      return typeof value === "string" ? value : null;
    },
    role,
    timeZone,
  );
  return { timeZone, sessions: fetchInterventionSessions(scheduleRange(view, timeZone)) };
}
