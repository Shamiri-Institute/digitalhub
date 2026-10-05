"use server";

import { eq } from "drizzle-orm";

import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fellow } from "#/db/schema";
import { requireHubRole } from "#/lib/auth/require-hub-role";

export async function assignFellowSupervisor({
  fellowId,
  supervisorId,
}: {
  fellowId: string;
  supervisorId: string;
}) {
  try {
    // Both the fellow and the new supervisor must be in the coordinator's hub.
    const { hubId } = await requireHubRole(ImplementerRole.HUB_COORDINATOR);
    const [fellowInHub, assigned] = await Promise.all([
      db.query.fellow.findFirst({
        where: (f, { and, eq }) => and(eq(f.id, fellowId), eq(f.hubId, hubId)),
        columns: { id: true },
      }),
      db.query.supervisor.findFirst({
        where: (s, { and, eq }) => and(eq(s.id, supervisorId), eq(s.hubId, hubId)),
        columns: { supervisorName: true },
      }),
    ]);
    if (!fellowInHub || !assigned) {
      throw new Error("Fellow or supervisor not found");
    }

    const [updated] = await db
      .update(fellow)
      .set({ supervisorId })
      .where(eq(fellow.id, fellowId))
      .returning({ fellowName: fellow.fellowName });
    if (!updated) {
      throw new Error(`Fellow ${fellowId} not found`);
    }
    return {
      success: true,
      message: `Successfully assigned ${updated.fellowName} to ${assigned.supervisorName ?? "supervisor"}.`,
    };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong assigning a supervisor" };
  }
}
