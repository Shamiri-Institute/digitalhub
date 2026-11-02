"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import type { z } from "zod";

import { db, isUniqueViolation, type Transaction } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { hubCoordinator, implementerMember } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { requireSuperAdmin } from "#/lib/auth/admin-access";
import { objectId } from "#/lib/crypto";
import type { ActionResponse } from "#/types/actions.types";
import { actionFailure, AdminActionError } from "./action-error";
import { CreateHubManagerSchema, HubManagerRefSchema } from "./hub-manager-schemas";
import { addImplementerMember } from "./members";

const NOT_FOUND_MESSAGE = "Hub manager not found";

async function findCallerHub(tx: Transaction, hubId: string, implementerId: string) {
  const projectId = await getActiveProjectId();
  const callerHub = await tx.query.hub.findFirst({
    where: (h, { and, eq }) =>
      and(eq(h.id, hubId), eq(h.implementerId, implementerId), eq(h.projectId, projectId)),
    columns: { id: true },
  });
  if (!callerHub) {
    throw new AdminActionError("Hub not found");
  }
  return callerHub;
}

// Not checked for a deleted row: older hub managers may never have had a membership.
async function removeHubAccess(tx: Transaction, implementerId: string, hubManagerId: string) {
  await tx
    .delete(implementerMember)
    .where(
      and(
        eq(implementerMember.implementerId, implementerId),
        eq(implementerMember.role, ImplementerRole.HUB_COORDINATOR),
        eq(implementerMember.identifier, hubManagerId),
      ),
    );
}

// coordinator_email is unique across implementers; this names the clash, the index catches races.
async function assertHubManagerEmailIsFree(tx: Transaction, email: string, implementerId: string) {
  const clashing = await tx.query.hubCoordinator.findFirst({
    where: (c, { sql }) => sql`lower(trim(${c.coordinatorEmail})) = ${email}`,
    columns: { implementerId: true, archivedAt: true },
    with: { assignedHub: { columns: { hubName: true } } },
  });
  if (!clashing) {
    return;
  }
  if (clashing.implementerId !== implementerId) {
    throw new AdminActionError("This email belongs to another organisation's hub manager");
  }
  const hubName = clashing.assignedHub?.hubName ?? "another hub";
  throw new AdminActionError(
    clashing.archivedAt
      ? `This email belongs to a hub manager archived from ${hubName}. Restore them there instead.`
      : `This email already belongs to a hub manager of ${hubName}`,
  );
}

export async function createHubManager(
  hubId: string,
  data: z.input<typeof CreateHubManagerSchema>,
): Promise<ActionResponse> {
  try {
    const { implementerId } = await requireSuperAdmin();
    const parsed = CreateHubManagerSchema.parse(data);

    await db.transaction(async (tx) => {
      const callerHub = await findCallerHub(tx, hubId, implementerId);
      await assertHubManagerEmailIsFree(tx, parsed.coordinatorEmail, implementerId);

      // visible_id is deprecated but NOT NULL and unique, so a new row reuses its id.
      const hubManagerId = objectId("coord");
      await tx.insert(hubCoordinator).values({
        ...parsed,
        id: hubManagerId,
        visibleId: hubManagerId,
        implementerId,
        assignedHubId: callerHub.id,
      });
      await addImplementerMember(tx, {
        implementerId,
        email: parsed.coordinatorEmail,
        name: parsed.coordinatorName,
        role: ImplementerRole.HUB_COORDINATOR,
        identifier: hubManagerId,
      });
    });

    refresh();
    return { success: true, message: `Added ${parsed.coordinatorName}` };
  } catch (error) {
    if (isUniqueViolation(error, "hub_coordinators_coordinator_email_key")) {
      return { success: false, message: "A hub manager with this email already exists" };
    }
    return actionFailure(error, "Sorry, could not add the hub manager.");
  }
}

export async function archiveHubManager(
  data: z.infer<typeof HubManagerRefSchema>,
): Promise<ActionResponse> {
  try {
    const { implementerId } = await requireSuperAdmin();
    const parsed = HubManagerRefSchema.parse(data);

    const archived = await db.transaction(async (tx) => {
      const callerHub = await findCallerHub(tx, parsed.hubId, implementerId);
      const [archivedManager] = await tx
        .update(hubCoordinator)
        .set({ archivedAt: new Date() })
        .where(
          and(
            eq(hubCoordinator.id, parsed.hubManagerId),
            eq(hubCoordinator.implementerId, implementerId),
            eq(hubCoordinator.assignedHubId, callerHub.id),
            isNull(hubCoordinator.archivedAt),
          ),
        )
        .returning({ coordinatorName: hubCoordinator.coordinatorName });
      if (!archivedManager) {
        throw new AdminActionError(NOT_FOUND_MESSAGE);
      }

      await removeHubAccess(tx, implementerId, parsed.hubManagerId);
      return archivedManager;
    });

    refresh();
    return { success: true, message: `Archived ${archived.coordinatorName}` };
  } catch (error) {
    return actionFailure(error, "Sorry, could not archive the hub manager.");
  }
}

export async function restoreHubManager(
  data: z.infer<typeof HubManagerRefSchema>,
): Promise<ActionResponse> {
  try {
    const { implementerId } = await requireSuperAdmin();
    const parsed = HubManagerRefSchema.parse(data);

    const restored = await db.transaction(async (tx) => {
      const callerHub = await findCallerHub(tx, parsed.hubId, implementerId);
      const [restoredManager] = await tx
        .update(hubCoordinator)
        .set({ archivedAt: null })
        .where(
          and(
            eq(hubCoordinator.id, parsed.hubManagerId),
            eq(hubCoordinator.implementerId, implementerId),
            eq(hubCoordinator.assignedHubId, callerHub.id),
            isNotNull(hubCoordinator.archivedAt),
          ),
        )
        .returning({
          coordinatorName: hubCoordinator.coordinatorName,
          coordinatorEmail: hubCoordinator.coordinatorEmail,
        });
      if (!restoredManager) {
        throw new AdminActionError(NOT_FOUND_MESSAGE);
      }
      if (!restoredManager.coordinatorEmail) {
        throw new AdminActionError("This hub manager has no email to sign in with");
      }

      // A membership left from an archive outside the app would otherwise show the role twice.
      await removeHubAccess(tx, implementerId, parsed.hubManagerId);
      await addImplementerMember(tx, {
        implementerId,
        email: restoredManager.coordinatorEmail.trim().toLowerCase(),
        name: restoredManager.coordinatorName,
        role: ImplementerRole.HUB_COORDINATOR,
        identifier: parsed.hubManagerId,
      });
      return restoredManager;
    });

    refresh();
    return { success: true, message: `Restored ${restored.coordinatorName}` };
  } catch (error) {
    return actionFailure(error, "Sorry, could not restore the hub manager.");
  }
}
