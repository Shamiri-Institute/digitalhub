import { and, eq } from "drizzle-orm";

import type { Transaction } from "#/db/client";
import { hub } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { AdminActionError } from "./action-error";

export async function lockCallerHub(tx: Transaction, hubId: string, implementerId: string) {
  const activeProjectId = await getActiveProjectId();
  const [callerHub] = await tx
    .select({ id: hub.id, hubName: hub.hubName, projectId: hub.projectId })
    .from(hub)
    .where(
      and(
        eq(hub.id, hubId),
        eq(hub.implementerId, implementerId),
        eq(hub.projectId, activeProjectId),
      ),
    )
    .for("update");
  if (!callerHub) {
    throw new AdminActionError("Hub not found");
  }
  return callerHub;
}
