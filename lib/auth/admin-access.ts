import { and, eq, inArray } from "drizzle-orm";
import { cache } from "react";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/db/client";
import { AdminTeam, ImplementerRole } from "#/db/enums";
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

/** Super admins and admins in the Research team build and manage surveys. */
export function canManageSurveys(admin: { isSuperAdmin: boolean; team: AdminTeam | null }) {
  return admin.isSuperAdmin || admin.team === AdminTeam.RESEARCH;
}

/** Surveys belong to an implementer and a project; an admin works in one of each at a time. */
export type SurveyScope = { userId: string; implementerId: string; projectId: string };

/**
 * The signed-in admin's survey scope: their implementer and active project. Null when they cannot
 * manage surveys or have no active project; any other role is redirected to its own home. Pages
 * and server actions both go through here, so survey access is checked one way, and the session
 * is read once per request.
 */
export const surveyScope = cache(async (): Promise<SurveyScope | null> => {
  const admin = await currentAdminUser();
  const userId = admin?.session.user.id;
  const projectId = admin?.session.user.activeProjectId;
  if (!admin || !userId || !projectId || !canManageSurveys(admin.profile)) {
    return null;
  }
  return { userId, implementerId: admin.profile.implementerId, projectId };
});

/** For server actions: the survey scope, or a ForbiddenRoleError the action reports. */
export async function requireSurveyScope() {
  const scope = await surveyScope();
  if (!scope) {
    throw new ForbiddenRoleError(
      "Forbidden: surveys are managed by super admins and the Research team",
    );
  }
  return scope;
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
