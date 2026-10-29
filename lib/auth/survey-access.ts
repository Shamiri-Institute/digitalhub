import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { requireSurveyScope } from "#/lib/auth/admin-access";
import { ForbiddenRoleError, NotFoundError, requireAuthRole } from "#/lib/auth/require-auth-role";
import { PrintRunError } from "#/lib/survey/print-run";

/** Where a print run's copies may go: one hub, inside the caller's implementer and project. */
export type HubSurveyScope = {
  userId: string;
  implementerId: string;
  projectId: string;
  hubId: string;
};

/**
 * Who is looking at print runs: a hub coordinator sees their hub's, a Research admin every hub's
 * in their implementer and project. There is no unscoped viewer, so no query can forget the filter.
 */
export type PrintRunViewer =
  | ({ kind: "hub" } & HubSurveyScope)
  | { kind: "project"; userId: string; implementerId: string; projectId: string };

/**
 * The signed-in hub coordinator as a print-run viewer: their hub, taken from the session, and that
 * hub's implementer and project, whose surveys they may print. Null for anyone else, and for a
 * coordinator without a hub or whose hub is archived. Pages and actions both use it.
 */
export async function hubCoordinatorViewer(): Promise<PrintRunViewer | null> {
  const coordinator = await currentHubCoordinator();
  const userId = coordinator?.session.user.id;
  const coordinatorHub = coordinator?.profile.assignedHub;
  if (!userId || !coordinatorHub || coordinatorHub.archivedAt) {
    return null;
  }
  return {
    kind: "hub",
    userId,
    hubId: coordinatorHub.id,
    implementerId: coordinatorHub.implementerId,
    projectId: coordinatorHub.projectId,
  };
}

export async function requirePrintRunViewer(): Promise<PrintRunViewer> {
  const { role } = await requireAuthRole(ImplementerRole.ADMIN, ImplementerRole.HUB_COORDINATOR);
  if (role === ImplementerRole.HUB_COORDINATOR) {
    const viewer = await hubCoordinatorViewer();
    if (!viewer) {
      throw new ForbiddenRoleError("You have no active hub");
    }
    return viewer;
  }
  return { kind: "project", ...(await requireSurveyScope()) };
}

/**
 * The hub a run goes to. A hub coordinator's is their own, and naming another hub is refused before
 * any query runs. An admin names a hub, which must be an unarchived hub of their implementer and
 * project.
 */
export async function printRunScope(
  viewer: PrintRunViewer,
  requestedHubId: string | undefined,
): Promise<HubSurveyScope> {
  if (viewer.kind === "hub") {
    if (requestedHubId !== undefined && requestedHubId !== viewer.hubId) {
      throw new ForbiddenRoleError("You can only print for your own hub");
    }
    const { kind: _, ...scope } = viewer;
    return scope;
  }
  if (!requestedHubId) {
    throw new PrintRunError("Choose a hub");
  }
  const hubInProject = await db.query.hub.findFirst({
    where: (h, { and, eq, isNull }) =>
      and(
        eq(h.id, requestedHubId),
        eq(h.implementerId, viewer.implementerId),
        eq(h.projectId, viewer.projectId),
        isNull(h.archivedAt),
      ),
    columns: { id: true },
  });
  if (!hubInProject) {
    throw new NotFoundError("Hub");
  }
  const { userId, implementerId, projectId } = viewer;
  return { userId, implementerId, projectId, hubId: hubInProject.id };
}
