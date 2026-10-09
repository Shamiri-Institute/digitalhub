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
  const [userSession, adminUser, isAdminEmail, adminProjects, personnel] = await Promise.all([
    getCurrentPersonnel(),
    currentAdminUser(),
    isCurrentUserAdmin(),
    loadAdminProjects(),
    fetchImplementerPersonnel(),
  ]);
  const user = userSession?.session.user ?? null;
  const isAdminUser = isAdminEmail || user?.activeMembership?.role === ImplementerRole.ADMIN;
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
