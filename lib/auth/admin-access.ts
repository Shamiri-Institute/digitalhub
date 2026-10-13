import { and, eq, inArray } from "drizzle-orm";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { hub, implementerMember } from "#/db/schema";
import { ForbiddenRoleError, requireAuthRole } from "#/lib/auth/require-auth-role";

/**
 * Guard for actions that only a super admin of the caller's implementer may run. The implementer
 * comes from the session, and the super-admin flag is read from the caller's own admin profile.
 */
export async function requireSuperAdmin() {
  const context = await requireAuthRole(ImplementerRole.ADMIN);
  const { identifier, implementerId } = context;

  const admin = identifier
    ? await db.query.adminUser.findFirst({
        where: (a, { and, eq }) => and(eq(a.id, identifier), eq(a.implementerId, implementerId)),
        columns: { isSuperAdmin: true },
      })
    : undefined;
  if (!admin?.isSuperAdmin) {
    throw new ForbiddenRoleError("Forbidden: this action requires a super admin");
  }

  return context;
}

export function projectsAdministeredBy(userId: string) {
  return db
    .selectDistinct({ id: hub.projectId })
    .from(hub)
    .where(
      inArray(
        hub.implementerId,
        db
          .select({ id: implementerMember.implementerId })
          .from(implementerMember)
          .where(
            and(
              eq(implementerMember.userId, userId),
              eq(implementerMember.role, ImplementerRole.ADMIN),
            ),
          ),
      ),
    );
}
