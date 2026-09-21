import type { ImplementerRole } from "#/db/enums";
import { getCurrentUserSession } from "#/app/auth";

export class UnauthenticatedError extends Error {
  constructor(message = "The session has not been authenticated") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenRoleError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenRoleError";
  }
}

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
    throw new UnauthenticatedError();
  }

  if (allowedRoles.length === 0) {
    return { userId };
  }

  const membership = session.user.activeMembership;
  if (!membership?.role || !membership.implementerId) {
    throw new ForbiddenRoleError("No active implementer membership found for user");
  }

  if (!allowedRoles.includes(membership.role)) {
    throw new ForbiddenRoleError(
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
