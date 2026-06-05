"use server";

import { ImplementerRole, type SessionStatus } from "@prisma/client";
import type { Filters } from "#/app/(platform)/hc/schedule/context/filters-context";
import { getActiveProjectId } from "#/lib/active-project-id";
import { getDefaultSessionDateRange } from "#/lib/date-utils";
import { db } from "#/lib/db";

export async function fetchInterventionSessions({
  activeProjectId: clientActiveProjectId,
  hubId,
  implementerId,
  role,
  start,
  end,
  filters,
  fellowId,
}: {
  activeProjectId?: string | null;
  hubId?: string;
  implementerId?: string;
  role: ImplementerRole;
  start?: Date;
  end?: Date;
  filters?: Filters;
  fellowId?: string;
}) {
  let projectId: string;
  if (role === ImplementerRole.ADMIN) {
    if (!implementerId) {
      throw new Error("No implementer ID provided for admin");
    }
    projectId = clientActiveProjectId ?? (await getActiveProjectId());
  } else {
    if (!hubId) {
      throw new Error("No assigned hub ID provided");
    }
    const hub = await db.hub.findUnique({
      where: { id: hubId },
      select: { projectId: true },
    });
    if (!hub?.projectId) {
      throw new Error("Hub has no project");
    }
    projectId = hub.projectId;
  }

  const { start: rangeStart, end: rangeEnd } =
    start && end ? { start, end } : getDefaultSessionDateRange();

  const isFellow = role === ImplementerRole.FELLOW && !!fellowId;

  const sessions = await db.interventionSession.findMany({
    where: {
      sessionDate: {
        gte: rangeStart,
        lte: rangeEnd,
      },
      // session: {
      //   sessionName: {
      //     in:
      //       filters &&
      //       Object.keys(filters.sessionTypes).filter((sessionType) => {
      //         return filters.sessionTypes[sessionType];
      //       }),
      //   },
      // },
      hub: {
        id: hubId,
        implementerId,
        projectId,
      },
      status: {
        in:
          filters &&
          (Object.keys(filters.statusTypes).filter((status) => {
            return filters.statusTypes[status];
          }) as SessionStatus[]),
      },
      ...(isFellow
        ? {
            school: {
              interventionGroups: { some: { leaderId: fellowId } },
            },
          }
        : {}),
    },
    include: {
      hub: {
        select: { visibleId: true },
      },
      school: {
        include: {
          interventionGroups: {
            ...(isFellow ? { where: { leaderId: fellowId } } : {}),
            include: {
              students: {
                include: {
                  _count: {
                    select: {
                      clinicalCases: true,
                    },
                  },
                  studentAttendances: true,
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
