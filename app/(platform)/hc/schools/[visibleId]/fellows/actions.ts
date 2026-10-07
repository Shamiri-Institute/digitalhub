"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow, hub } from "#/db/schema";
import { requireHubRole } from "#/lib/auth/require-hub-role";

export async function assignFellowSupervisor({
  fellowId,
  supervisorId,
}: {
  fellowId: string;
  supervisorId: string;
}) {
  try {
    // The new supervisor must be in the coordinator's hub. The fellow may come from another hub of
    // the same implementer: hubs borrow fellows from each other.
    const { hubId: coordinatorHubId } = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
    const supervisorInCoordinatorHub = await db.query.supervisor.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, supervisorId), eq(s.hubId, coordinatorHubId)),
      columns: { supervisorName: true },
    });
    if (!supervisorInCoordinatorHub) {
      throw new Error("Supervisor not found");
    }

    const [updated] = await db
      .update(fellow)
      .set({ supervisorId })
      .where(
        and(
          eq(fellow.id, fellowId),
          eq(
            fellow.implementerId,
            db.select({ id: hub.implementerId }).from(hub).where(eq(hub.id, coordinatorHubId)),
          ),
        ),
      )
      .returning({ fellowName: fellow.fellowName });
    if (!updated) {
      throw new Error(`Fellow ${fellowId} not found`);
    }
    refresh();
    return {
      success: true,
      message: `Successfully assigned ${updated.fellowName} to ${supervisorInCoordinatorHub.supervisorName ?? "supervisor"}.`,
    };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong assigning a supervisor" };
  }
}
