import { cache } from "react";

import { currentResearchUser } from "#/app/auth";
import { ForbiddenRoleError } from "#/lib/auth/require-auth-role";

/** Research data belongs to an implementer and a project; a research user works in one of each. */
export type ResearchScope = { userId: string; implementerId: string; projectId: string };

/**
 * The signed-in research user's scope: their profile's implementer and their active project. Null
 * when the profile is missing, belongs to another implementer than the membership, or there is no
 * active project. A user in another role is redirected to their own home. Pages and server actions
 * both go through here, so access is checked one way, and the session is read once per request.
 */
export const researchScope = cache(async (): Promise<ResearchScope | null> => {
  const researchUser = await currentResearchUser();
  if (!researchUser) {
    return null;
  }
  const { profile, session } = researchUser;
  const { id: userId, activeProjectId: projectId, activeMembership } = session.user;
  if (!userId || !projectId || activeMembership?.implementerId !== profile.implementerId) {
    return null;
  }
  return { userId, implementerId: profile.implementerId, projectId };
});

/** For server actions: the research user's scope, or a ForbiddenRoleError the action reports. */
export async function requireResearchScope() {
  const scope = await researchScope();
  if (!scope) {
    throw new ForbiddenRoleError(
      "Forbidden: this action requires a research user in an active project",
    );
  }
  return scope;
}
