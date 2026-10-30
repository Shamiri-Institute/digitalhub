import { cache } from "react";

import { currentAdminUser } from "#/app/auth";
import { db } from "#/db/client";
import { school } from "#/db/schema";
import { countOf } from "#/db/sql";
import { getActiveProjectId } from "#/lib/active-project-id";

// drizzle-orm 0.45 rewrites every column reference inside a relational-query `extras`
// expression to the current table's alias, so a correlated subquery must name the other
// table in plain SQL and touch the current row only through the callback parameter.
const notDroppedOut = (alias: string) =>
  `(${alias}.dropped_out = false or ${alias}.dropped_out is null)`;

export async function fetchAdminHubs(implementerId: string, projectId: string) {
  const hubs = await db.query.hub.findMany({
    where: (h, { and, eq }) => and(eq(h.implementerId, implementerId), eq(h.projectId, projectId)),
    with: {
      implementer: { columns: { implementerName: true } },
      coordinators: { columns: { coordinatorName: true, cellNumber: true, createdAt: true } },
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
    orderBy: (h, { asc }) => [asc(h.hubName), asc(h.id)],
  });

  return hubs;
}

export type AdminHub = Awaited<ReturnType<typeof fetchAdminHubs>>[number];

const adminHubScope = cache(async () => {
  const admin = await currentAdminUser();
  const implementerId = admin?.session.user.activeMembership?.implementerId;
  if (!implementerId) {
    return null;
  }
  return { implementerId, projectId: await getActiveProjectId() };
});

export const fetchAdminHub = cache(async (hubId: string) => {
  const scope = await adminHubScope();
  if (!scope) {
    return null;
  }
  const { implementerId: adminImplementerId, projectId: activeProjectId } = scope;
  return db.query.hub.findFirst({
    where: (h, { and, eq }) =>
      and(
        eq(h.id, hubId),
        eq(h.implementerId, adminImplementerId),
        eq(h.projectId, activeProjectId),
      ),
    columns: { id: true, hubName: true },
    with: { project: { columns: { name: true } } },
    extras: (h) => ({
      schoolsCount: countOf(school.hubId, h.id).as("schools_count"),
    }),
  });
});

export type AdminHubDetail = NonNullable<Awaited<ReturnType<typeof fetchAdminHub>>>;

export async function fetchSiblingHubs() {
  const scope = await adminHubScope();
  if (!scope) {
    return [];
  }
  const { implementerId: adminImplementerId, projectId: activeProjectId } = scope;
  return db.query.hub.findMany({
    where: (h, { and, eq }) =>
      and(eq(h.implementerId, adminImplementerId), eq(h.projectId, activeProjectId)),
    columns: { id: true, hubName: true },
    orderBy: (h, { asc }) => [asc(h.hubName), asc(h.id)],
  });
}

export type SiblingHub = Awaited<ReturnType<typeof fetchSiblingHubs>>[number];
