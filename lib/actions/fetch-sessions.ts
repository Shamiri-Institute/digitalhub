"use server";

import { Filters } from "#/app/(platform)/hc/schedule/context/filters-context";
import { db } from "#/lib/db";

export async function fetchInterventionSessions({
  hubId,
  start,
  end,
  filters,
}: {
  hubId: string;
  start?: Date;
  end?: Date;
  filters?: Filters;
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
      sessionType: {
        in:
          filters &&
          Object.keys(filters.sessionTypes).filter((sessionType) => {
            return filters.sessionTypes[sessionType];
          }),
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
