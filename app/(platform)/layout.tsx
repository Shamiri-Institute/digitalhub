import { currentAdminUser, getCurrentPersonnel } from "#/app/auth";
import { LayoutClient } from "#/components/layout-client";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fetchImplementerPersonnel, isCurrentUserAdmin } from "#/lib/actions/fetch-personnel";

async function loadAdminProjects() {
  if (!(await isCurrentUserAdmin())) {
    return null;
  }
  return db.query.project.findMany({
    orderBy: (p, { desc }) => desc(p.createdAt),
    columns: { id: true, name: true, visibleId: true },
  });
}

export type AdminProject = NonNullable<Awaited<ReturnType<typeof loadAdminProjects>>>[number];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [userSession, isAdminEmail, adminProjects, personnel] = await Promise.all([
    getCurrentPersonnel(),
    isCurrentUserAdmin(),
    loadAdminProjects(),
    fetchImplementerPersonnel(),
  ]);
  const user = userSession?.session.user ?? null;
  const isAdminUser = isAdminEmail || user?.activeMembership?.role === ImplementerRole.ADMIN;
  // currentAdminUser sends any other role to its own home, so only an admin may call it. For an
  // admin it is the cached profile that getCurrentPersonnel already loaded.
  const adminUser =
    user?.activeMembership?.role === ImplementerRole.ADMIN ? await currentAdminUser() : null;
  const isSuperAdmin = adminUser?.profile.isSuperAdmin ?? false;
  return (
    <LayoutClient
      user={user}
      profile={userSession ?? null}
      isAdminUser={isAdminUser}
      isSuperAdmin={isSuperAdmin}
      adminProjects={adminProjects}
      personnel={personnel}
    >
      {children}
    </LayoutClient>
  );
}
