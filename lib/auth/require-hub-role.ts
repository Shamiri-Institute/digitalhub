import { and, eq, inArray } from "drizzle-orm";
import { cache } from "react";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow, hub, interventionGroup, school } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { ForbiddenRoleError, NotFoundError, requireAuthRole } from "#/lib/auth/require-auth-role";

type HubRole =
  | typeof ImplementerRole.SUPERVISOR
  | typeof ImplementerRole.HUB_COORDINATOR
  | typeof ImplementerRole.FELLOW;

const hubIdOfProfile = cache(async (role: HubRole, profileId: string) => {
  if (role === ImplementerRole.HUB_COORDINATOR) {
    const coordinator = await db.query.hubCoordinator.findFirst({
      where: (hc, { eq }) => eq(hc.id, profileId),
      columns: { assignedHubId: true },
    });
    return coordinator?.assignedHubId ?? null;
  }
  const profileQuery = role === ImplementerRole.SUPERVISOR ? db.query.supervisor : db.query.fellow;
  const profile = await profileQuery.findFirst({
    where: (p, { eq }) => eq(p.id, profileId),
    columns: { hubId: true },
  });
  return profile?.hubId ?? null;
});

/**
 * The caller's role, profile id and hub, taken from the session. Actions compare the hub of the
 * record they write with this hub, so a caller cannot change another hub's records by sending
 * their ids.
 */
export const requireHubRole = cache(async (...allowedRoles: HubRole[]) => {
  const membership = await requireAuthRole(...allowedRoles);
  const role = membership.role as HubRole;
  const profileId = membership.identifier;
  const hubId = profileId ? await hubIdOfProfile(role, profileId) : null;
  if (!profileId || !hubId) {
    throw new ForbiddenRoleError("You have no assigned hub");
  }
  return {
    userId: membership.userId,
    implementerId: membership.implementerId,
    role,
    profileId,
    hubId,
  };
});

export async function requireSchoolInHub(schoolId: string | null | undefined, hubId: string) {
  const schoolInHub = schoolId
    ? await db.query.school.findFirst({
        where: (s, { and, eq }) => and(eq(s.id, schoolId), eq(s.hubId, hubId)),
        columns: { id: true },
      })
    : undefined;
  if (!schoolInHub) {
    throw new NotFoundError("School");
  }
}

export async function requireFellowsInHub(fellowIds: string[], hubId: string) {
  const uniqueIds = [...new Set(fellowIds)];
  const inHub =
    uniqueIds.length === 0
      ? []
      : await db
          .select({ id: fellow.id })
          .from(fellow)
          .where(and(inArray(fellow.id, uniqueIds), eq(fellow.hubId, hubId)));
  if (inHub.length !== uniqueIds.length) {
    throw new NotFoundError("Fellow");
  }
}

export function implementerHubsInProject(implementerId: string, projectId: string) {
  return db
    .select({ id: hub.id })
    .from(hub)
    .where(and(eq(hub.implementerId, implementerId), eq(hub.projectId, projectId)));
}

/**
 * The ids of the fellows a caller from requireHubRole may see in reports: the fellows of their hub,
 * and for a supervisor only the ones they supervise.
 */
export function fellowsInCallerScope(caller: Awaited<ReturnType<typeof requireHubRole>>) {
  if (caller.role === ImplementerRole.SUPERVISOR) {
    return db
      .select({ id: fellow.id })
      .from(fellow)
      .where(and(eq(fellow.supervisorId, caller.profileId), eq(fellow.hubId, caller.hubId)));
  }
  if (caller.role === ImplementerRole.HUB_COORDINATOR) {
    return db.select({ id: fellow.id }).from(fellow).where(eq(fellow.hubId, caller.hubId));
  }
  return db.select({ id: fellow.id }).from(fellow).where(eq(fellow.id, caller.profileId));
}

/**
 * Schools the caller may see: their implementer's in the active project (admin), their hub's, or
 * where they lead a group. Wrapped in an object because awaiting a query builder runs it.
 */
export async function visibleSchoolIds() {
  const membership = await requireAuthRole(
    ImplementerRole.ADMIN,
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.FELLOW,
  );
  if (membership.role === ImplementerRole.ADMIN) {
    const activeProjectId = await getActiveProjectId();
    return {
      ids: db
        .select({ id: school.id })
        .from(school)
        .innerJoin(hub, eq(hub.id, school.hubId))
        .where(
          and(eq(hub.implementerId, membership.implementerId), eq(hub.projectId, activeProjectId)),
        ),
    };
  }
  const caller = await requireHubRole(
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.FELLOW,
  );
  if (caller.role === ImplementerRole.FELLOW) {
    return {
      ids: db
        .select({ id: interventionGroup.schoolId })
        .from(interventionGroup)
        .where(eq(interventionGroup.leaderId, caller.profileId)),
    };
  }
  return { ids: db.select({ id: school.id }).from(school).where(eq(school.hubId, caller.hubId)) };
}
