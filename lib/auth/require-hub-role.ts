import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { ForbiddenRoleError, requireAuthRole } from "#/lib/auth/require-auth-role";

type HubRole =
  | typeof ImplementerRole.SUPERVISOR
  | typeof ImplementerRole.HUB_COORDINATOR
  | typeof ImplementerRole.FELLOW;

async function hubOf(role: HubRole, profileId: string) {
  if (role === ImplementerRole.HUB_COORDINATOR) {
    const row = await db.query.hubCoordinator.findFirst({
      where: (hc, { eq }) => eq(hc.id, profileId),
      columns: { assignedHubId: true },
    });
    return row?.assignedHubId ?? null;
  }
  const table = role === ImplementerRole.SUPERVISOR ? db.query.supervisor : db.query.fellow;
  const row = await table.findFirst({
    where: (p, { eq }) => eq(p.id, profileId),
    columns: { hubId: true },
  });
  return row?.hubId ?? null;
}

/**
 * The caller's role, profile id and hub, taken from the session. Actions compare the hub of the
 * record they write with this hub, so a caller cannot change another hub's records by sending
 * their ids.
 */
export async function requireHubRole(...allowedRoles: HubRole[]) {
  const auth = await requireAuthRole(...allowedRoles);
  const role = auth.role as HubRole;
  const profileId = auth.identifier;
  const hubId = profileId ? await hubOf(role, profileId) : null;
  if (!profileId || !hubId) {
    throw new ForbiddenRoleError("You have no assigned hub");
  }
  return { userId: auth.userId, role, profileId, hubId };
}

/**
 * Throws unless the school belongs to the hub. A missing school and a school in another hub get
 * the same message, so the error does not reveal which ids exist.
 */
export async function requireSchoolInHub(schoolId: string | null | undefined, hubId: string) {
  const row = schoolId
    ? await db.query.school.findFirst({
        where: (s, { and, eq }) => and(eq(s.id, schoolId), eq(s.hubId, hubId)),
        columns: { id: true },
      })
    : undefined;
  if (!row) {
    throw new Error("School not found");
  }
}
