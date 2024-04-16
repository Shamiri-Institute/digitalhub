"use server";

import { db } from "#/lib/db";

export async function fetchInterventionSessions({ hubId }: { hubId: string }) {
  if (!hubId) {
    throw new Error("No assigned hub ID provided");
  }

  const sessions = await db.interventionSession.findMany({
    where: {
      school: { hubId },
    },
    include: {
      school: true,
    },
  });

  return sessions;
}
