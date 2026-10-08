import "server-only";

import { eq, type SQLWrapper } from "drizzle-orm";

import { db } from "#/db/client";
import { interventionGroup } from "#/db/schema";

/**
 * Sessions between `start` and `end` at the hubs the page's caller may see. A fellow sees only
 * the schools where they lead a group, and only their own groups there.
 */
export async function fetchInterventionSessions(
  { start, end }: { start: Date; end: Date },
  { hubIds, fellowId }: { hubIds: string[] | SQLWrapper; fellowId?: string },
) {
  const sessions = await db.query.interventionSession.findMany({
    where: (s, { and, gte, lt, inArray, isNotNull }) =>
      and(
        gte(s.sessionDate, start),
        lt(s.sessionDate, end),
        inArray(s.hubId, hubIds),
        isNotNull(s.status),
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
      sessionRatings: true,
      session: true,
      school: {
        columns: { id: true, visibleId: true, schoolName: true, assignedSupervisorId: true },
        with: {
          interventionGroups: {
            ...(fellowId !== undefined ? { where: (g, { eq }) => eq(g.leaderId, fellowId) } : {}),
            columns: { id: true, leaderId: true, groupName: true },
          },
        },
      },
    },
    orderBy: (s, { asc }) => asc(s.sessionDate),
  });
  // One object per school, so the page payload carries each school once, not once per session.
  const schoolById = new Map(sessions.map((s) => [s.schoolId, s.school]));
  return sessions.map((s) => ({ ...s, school: schoolById.get(s.schoolId) ?? null }));
}

export type Session = Awaited<ReturnType<typeof fetchInterventionSessions>>[number];
