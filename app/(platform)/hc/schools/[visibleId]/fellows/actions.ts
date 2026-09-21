"use server";

import { eq } from "drizzle-orm";

import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/db/client";
import { fellow } from "#/db/schema";

async function checkAuth() {
  const hc = await currentHubCoordinator();

  if (!hc) {
    throw new Error("User not authorised to perform this function");
  }
}

export async function assignFellowSupervisor({
  fellowId,
  supervisorId,
}: {
  fellowId: string;
  supervisorId: string;
}) {
  try {
    await checkAuth();
    const [updated] = await db
      .update(fellow)
      .set({ supervisorId })
      .where(eq(fellow.id, fellowId))
      .returning({ fellowName: fellow.fellowName });
    if (!updated) {
      throw new Error(`Fellow ${fellowId} not found`);
    }
    const assigned = await db.query.supervisor.findFirst({
      where: (s, { eq }) => eq(s.id, supervisorId),
      columns: { supervisorName: true },
    });
    return {
      success: true,
      message: `Successfully assigned ${updated.fellowName} to ${assigned ? assigned.supervisorName : "supervisor"}.`,
    };
  } catch (error: unknown) {
    console.error(error);
    return { error: "Something went wrong assigning a supervisor" };
  }
}
