import { eq, or } from "drizzle-orm";
import { cache } from "react";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow, supervisor } from "#/db/schema";
import { ForbiddenRoleError, requireAuthRole } from "#/lib/auth/require-auth-role";

type HubRole =
  | typeof ImplementerRole.SUPERVISOR
  | typeof ImplementerRole.HUB_COORDINATOR
  | typeof ImplementerRole.FELLOW;

/** The hub a supervisor, hub coordinator or fellow profile belongs to, or null. */
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

/**
 * The hub where a session takes place: the session's hub, else its school's hub. Hubs borrow
 * fellows, so the fellow's home hub is not the hub of their work.
 */
export function hubOfSession(session: {
  hubId: string | null;
  school: { hubId: string | null } | null;
}) {
  return session.hubId ?? session.school?.hubId ?? null;
}

/**
 * Throws unless the school belongs to the hub. A missing school and a school in another hub get
 * the same message, so the error does not reveal which ids exist.
 */
export async function requireSchoolInHub(schoolId: string | null | undefined, hubId: string) {
  const schoolInHub = schoolId
    ? await db.query.school.findFirst({
        where: (s, { and, eq }) => and(eq(s.id, schoolId), eq(s.hubId, hubId)),
        columns: { id: true },
      })
    : undefined;
  if (!schoolInHub) {
    throw new Error("School not found");
  }
}

/**
 * The ids of the fellows a caller from requireHubRole may see in reports. A supervisor sees the
 * fellows they supervise. A hub coordinator sees the fellows of their hub and the fellows that a
 * supervisor of their hub supervises, because hubs borrow fellows from other hubs.
 */
export function fellowsInCallerScope(caller: Awaited<ReturnType<typeof requireHubRole>>) {
  if (caller.role === ImplementerRole.SUPERVISOR) {
    return db
      .select({ id: fellow.id })
      .from(fellow)
      .where(eq(fellow.supervisorId, caller.profileId));
  }
  if (caller.role === ImplementerRole.HUB_COORDINATOR) {
    return db
      .select({ id: fellow.id })
      .from(fellow)
      .leftJoin(supervisor, eq(fellow.supervisorId, supervisor.id))
      .where(or(eq(fellow.hubId, caller.hubId), eq(supervisor.hubId, caller.hubId)));
  }
  return db.select({ id: fellow.id }).from(fellow).where(eq(fellow.id, caller.profileId));
}
