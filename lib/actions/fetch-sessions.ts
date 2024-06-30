"use server";

import { db } from "#/lib/db";

export async function fetchInterventionSessions({
  hubId,
  start,
  end,
}: {
  hubId: string;
  start?: Date;
  end?: Date;
}) {
  if (!hubId) {
    throw new Error("No assigned hub ID provided");
  }

  const sessions = await db.interventionSession.findMany({
    where: {
      school: { hubId },
      sessionDate: {
        gte: start,
        lte: end,
      },
    },
    include: {
      school: true,
    },
    orderBy: {
      sessionDate: "asc",
    },
  });

  return sessions;
}
