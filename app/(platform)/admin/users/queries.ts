import { db } from "#/db/client";

/** The admins of an implementer with their access, for the users table. */
export async function fetchImplementerAdmins(implementerId: string) {
  return db.query.adminUser.findMany({
    where: (a, { eq }) => eq(a.implementerId, implementerId),
    columns: { id: true, adminName: true, email: true, isSuperAdmin: true, team: true },
    orderBy: (a, { asc }) => [asc(a.adminName), asc(a.id)],
  });
}

export type ImplementerAdmin = Awaited<ReturnType<typeof fetchImplementerAdmins>>[number];
