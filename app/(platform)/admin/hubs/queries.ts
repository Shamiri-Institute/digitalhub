import { db } from "#/db/client";

// drizzle-orm 0.45 rewrites every column reference inside a relational-query `extras`
// expression to the current table's alias, so a correlated subquery must name the other
// table in plain SQL and touch the current row only through the callback parameter.
const notDroppedOut = (alias: string) =>
  `(${alias}.dropped_out = false or ${alias}.dropped_out is null)`;

/** Hubs of an implementer in a project with everything the admin hubs table renders. */
export async function fetchAdminHubs(implementerId: string, projectId: string) {
  const hubs = await db.query.hub.findMany({
    where: (h, { and, eq }) => and(eq(h.implementerId, implementerId), eq(h.projectId, projectId)),
    with: {
      schools: {
        with: {
          assignedSupervisor: true,
          interventionSessions: {
            with: { sessionRatings: true, session: true },
          },
          students: {
            with: { assignedGroup: true },
            extras: (s, { sql }) => ({
              clinicalCasesCount:
                sql<number>`(select count(*)::int from clinical_screening_info c where c.student_id = ${s.id})`.as(
                  "clinical_cases_count",
                ),
            }),
          },
        },
      },
      implementer: true,
      coordinators: true,
    },
    extras: (h, { sql }) => ({
      fellowsCount:
        sql<number>`(select count(*)::int from fellows f where f.hub_id = ${h.id} and ${sql.raw(notDroppedOut("f"))})`.as(
          "fellows_count",
        ),
      supervisorsCount:
        sql<number>`(select count(*)::int from supervisors s where s.hub_id = ${h.id} and ${sql.raw(notDroppedOut("s"))})`.as(
          "supervisors_count",
        ),
    }),
  });

  return hubs;
}

export type AdminHub = Awaited<ReturnType<typeof fetchAdminHubs>>[number];
