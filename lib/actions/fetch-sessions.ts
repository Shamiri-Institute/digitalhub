"use server";

import { Filters } from "#/app/(platform)/hc/schedule/context/filters-context";
import { db } from "#/lib/db";
import { SessionStatus } from "@prisma/client";

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
      session: {
        sessionName: {
          in:
            filters &&
            Object.keys(filters.sessionTypes).filter((sessionType) => {
              return filters.sessionTypes[sessionType];
            }),
        },
      },
      status: {
        in:
          filters &&
          (Object.keys(filters.statusTypes).filter((status) => {
            return filters.statusTypes[status];
          }) as SessionStatus[]),
      },
    },
    include: {
      school: true,
      sessionRatings: true,
      session: true,
    },
    orderBy: {
      sessionDate: "asc",
    },
  });

  return sessions;
}
