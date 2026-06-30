import type { ImplementerRole } from "@prisma/client";
import { getCurrentUserSession } from "#/app/auth";

export interface AuthOnlyContext {
  userId: string;
}

export interface AuthRoleContext extends AuthOnlyContext {
  role: ImplementerRole;
  implementerId: string;
  identifier: string | null;
}

export async function requireAuthRole(): Promise<AuthOnlyContext>;
export async function requireAuthRole(...allowedRoles: ImplementerRole[]): Promise<AuthRoleContext>;
export async function requireAuthRole(
  ...allowedRoles: ImplementerRole[]
): Promise<AuthOnlyContext | AuthRoleContext> {
  const session = await getCurrentUserSession();
  const userId = session?.user.id;
  if (!userId) {
    throw new Error("The session has not been authenticated");
  }

  if (allowedRoles.length === 0) {
    return { userId };
  }

  const membership = session.user.activeMembership;
  if (!membership?.role || !membership.implementerId) {
    throw new Error("No active implementer membership found for user");
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new Error(
      `Forbidden: this action requires one of [${allowedRoles.join(", ")}], but current role is ${membership.role}`,
    );
  }

  return {
    userId,
    role: membership.role,
    implementerId: membership.implementerId,
    identifier: membership.identifier,
  };
}
