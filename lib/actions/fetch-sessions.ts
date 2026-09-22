"use server";

import { and, eq } from "drizzle-orm";

import type { Filters } from "#/app/(platform)/hc/schedule/context/filters-context";
import { db } from "#/db/client";
import { ImplementerRole, type SessionStatus } from "#/db/enums";
import { hub, interventionGroup } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { getDefaultSessionDateRange } from "#/lib/date-utils";
import { clinicalCasesCountExtras } from "#/lib/actions/schedule-data";

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
  await requireAuthRole();
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
    const hubRow = await db.query.hub.findFirst({
      where: (h, { eq }) => eq(h.id, hubId),
      columns: { projectId: true },
    });
    if (!hubRow?.projectId) {
      throw new Error("Hub has no project");
    }
    projectId = hubRow.projectId;
  }

  const { start: rangeStart, end: rangeEnd } =
    start && end ? { start, end } : getDefaultSessionDateRange();

  const isFellow = role === ImplementerRole.FELLOW && !!fellowId;
  const statuses =
    filters &&
    (Object.keys(filters.statusTypes).filter((status) => {
      return filters.statusTypes[status];
    }) as SessionStatus[]);

  // Hubs of this project, narrowed to the caller's hub and/or implementer when given.
  const hubIds = db
    .select({ id: hub.id })
    .from(hub)
    .where(
      and(
        eq(hub.projectId, projectId),
        hubId ? eq(hub.id, hubId) : undefined,
        implementerId ? eq(hub.implementerId, implementerId) : undefined,
      ),
    );

  const sessions = await db.query.interventionSession.findMany({
    where: (s, { and, gte, lte, inArray }) =>
      and(
        gte(s.sessionDate, rangeStart),
        lte(s.sessionDate, rangeEnd),
        inArray(s.hubId, hubIds),
        statuses ? inArray(s.status, statuses) : undefined,
        isFellow
          ? inArray(
              s.schoolId,
              db
                .select({ schoolId: interventionGroup.schoolId })
                .from(interventionGroup)
                .where(eq(interventionGroup.leaderId, fellowId)),
            )
          : undefined,
      ),
    with: {
      hub: { columns: { visibleId: true } },
      sessionRatings: true,
      session: true,
    },
    orderBy: (s, { asc }) => asc(s.sessionDate),
  });

  const schoolIds = [...new Set(sessions.map((s) => s.schoolId).filter((id) => id !== null))];
  const schools =
    schoolIds.length === 0
      ? []
      : await db.query.school.findMany({
          where: (sc, { inArray }) => inArray(sc.id, schoolIds),
          with: {
            interventionGroups: {
              ...(isFellow ? { where: (g, { eq }) => eq(g.leaderId, fellowId) } : {}),
              with: {
                students: { extras: clinicalCasesCountExtras },
              },
            },
          },
        });
  const schoolById = new Map(schools.map((sc) => [sc.id, sc]));

  return sessions.map((s) => ({
    ...s,
    school: s.schoolId === null ? null : (schoolById.get(s.schoolId) ?? null),
  }));
}
