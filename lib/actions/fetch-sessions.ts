"use server";

import { ImplementerRole, type SessionStatus } from "@prisma/client";
import type { Filters } from "#/app/(platform)/hc/schedule/context/filters-context";
import { db } from "#/lib/db";

export async function fetchInterventionSessions({
  hubId,
  implementerId,
  role,
  start,
  end,
  filters,
}: {
  hubId?: string;
  implementerId?: string;
  role: ImplementerRole;
  start?: Date;
  end?: Date;
  filters?: Filters;
}) {
  if (role === ImplementerRole.ADMIN) {
    if (!implementerId) {
      throw new Error("No implementer ID provided for admin");
    }
  } else {
    if (!hubId) {
      throw new Error("No assigned hub ID provided");
    }
  }

  // First, fetch the sessions to get their IDs
  const sessionIds = await db.interventionSession.findMany({
    where: {
      sessionDate: {
        gte: start,
        lte: end,
      },
      hub: {
        id: hubId,
        implementerId,
      },
      status: {
        in:
          filters &&
          (Object.keys(filters.statusTypes).filter((status) => {
            return filters.statusTypes[status];
          }) as SessionStatus[]),
      },
    },
    select: {
      id: true,
    },
  });

  const sessionIdList = sessionIds.map((s) => s.id);

  // Then fetch the full sessions with filtered studentAttendances
  const sessions = await db.interventionSession.findMany({
    where: {
      id: {
        in: sessionIdList,
      },
    },
    include: {
      school: {
        include: {
          interventionGroups: {
            include: {
              students: {
                include: {
                  _count: {
                    select: {
                      clinicalCases: true,
                    },
                  },
                  studentAttendances: {
                    where: {
                      sessionId: {
                        in: sessionIdList,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      sessionRatings: true,
      session: true,
    },
    orderBy: {
      sessionDate: "asc",
    },
  });

  return sessions;
}
