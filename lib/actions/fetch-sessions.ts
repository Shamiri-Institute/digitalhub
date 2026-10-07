"use server";

import { and, eq } from "drizzle-orm";

import type { Filters } from "#/lib/schedule-filters";
import { db } from "#/db/client";
import { ImplementerRole, type SessionStatus } from "#/db/enums";
import { hub, interventionGroup } from "#/db/schema";
import { getActiveProjectId } from "#/lib/active-project-id";
import { requireAuthRole } from "#/lib/auth/require-auth-role";
import { requireHubRole } from "#/lib/auth/require-hub-role";
import { getDefaultSessionDateRange } from "#/lib/date-utils";
import { clinicalCasesCountExtras } from "#/lib/actions/schedule-data";

export async function fetchInterventionSessions({
  start,
  end,
  filters,
}: {
  start?: Date;
  end?: Date;
  filters?: Filters;
}) {
  const membership = await requireAuthRole(
    ImplementerRole.ADMIN,
    ImplementerRole.HUB_COORDINATOR,
    ImplementerRole.SUPERVISOR,
    ImplementerRole.FELLOW,
  );
  let projectId: string;
  let hubId: string | undefined;
  let implementerId: string | undefined;
  let fellowId: string | undefined;
  if (membership.role === ImplementerRole.ADMIN) {
    implementerId = membership.implementerId;
    projectId = await getActiveProjectId();
  } else {
    const caller = await requireHubRole(
      ImplementerRole.HUB_COORDINATOR,
      ImplementerRole.SUPERVISOR,
      ImplementerRole.FELLOW,
    );
    hubId = caller.hubId;
    fellowId = caller.role === ImplementerRole.FELLOW ? caller.profileId : undefined;
    const hubRow = await db.query.hub.findFirst({
      where: (h, { eq }) => eq(h.id, caller.hubId),
      columns: { projectId: true },
    });
    if (!hubRow?.projectId) {
      throw new Error("Hub has no project");
    }
    projectId = hubRow.projectId;
  }

  const { start: rangeStart, end: rangeEnd } =
    start && end ? { start, end } : getDefaultSessionDateRange();

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
        fellowId !== undefined
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
              ...(fellowId !== undefined ? { where: (g, { eq }) => eq(g.leaderId, fellowId) } : {}),
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
