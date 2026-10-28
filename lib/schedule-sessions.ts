import "server-only";

import { and, eq, gte, lt, sql } from "drizzle-orm";
import {
  currentAdminUser,
  currentFellow,
  currentHubCoordinator,
  currentSupervisor,
} from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { hub, interventionSession } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { fetchInterventionSessions } from "#/lib/actions/fetch-sessions";
import { parseScheduleView, scheduleRange } from "#/lib/schedule-view";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export type ScheduleSearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * The hubs whose sessions the signed-in user may see, from the profile of their active role. Each
 * `current*` loader is cached per request and the page has already called it, so this adds no
 * query. A user without that role gets no hubs.
 */
async function sessionScope(role: ImplementerRole) {
  switch (role) {
    case ImplementerRole.HUB_COORDINATOR: {
      const hubId = (await currentHubCoordinator())?.profile.assignedHubId;
      return { hubIds: hubId ? [hubId] : [] };
    }
    case ImplementerRole.SUPERVISOR: {
      const hubId = (await currentSupervisor())?.profile.hubId;
      return { hubIds: hubId ? [hubId] : [] };
    }
    case ImplementerRole.FELLOW: {
      const profile = (await currentFellow())?.profile;
      return { hubIds: profile?.hubId ? [profile.hubId] : [], fellowId: profile?.id };
    }
    case ImplementerRole.ADMIN: {
      const implementerId = (await currentAdminUser())?.session.user.activeMembership
        ?.implementerId;
      if (!implementerId) return { hubIds: [] };
      const projectId = await getActiveProjectId();
      return {
        hubIds: db
          .select({ id: hub.id })
          .from(hub)
          .where(and(eq(hub.implementerId, implementerId), eq(hub.projectId, projectId))),
      };
    }
    default:
      return { hubIds: [] };
  }
}

/**
 * Starts loading the sessions the URL names; the schedule reads the promise in a Suspense boundary.
 * `hubIds` are the hubs the user may see, and `sessionsWhere` selects the same sessions, for
 * loaders of data about them (attendance).
 */
export async function loadScheduleSessions(
  searchParams: ScheduleSearchParams,
  role: ImplementerRole,
) {
  const [timeZone, scope] = await Promise.all([viewerTimeZone(), sessionScope(role)]);
  if (!timeZone)
    return { timeZone, sessions: null, hubIds: scope.hubIds, sessionsWhere: sql`false` };
  const params = await searchParams;
  const view = parseScheduleView(
    (name) => {
      const value = params[name];
      return typeof value === "string" ? value : null;
    },
    role,
    timeZone,
  );
  const range = scheduleRange(view, timeZone);
  return {
    timeZone,
    sessions: fetchInterventionSessions(range, scope),
    hubIds: scope.hubIds,
    sessionsWhere: sql`${gte(interventionSession.sessionDate, range.start)} and ${lt(interventionSession.sessionDate, range.end)}`,
  };
}
