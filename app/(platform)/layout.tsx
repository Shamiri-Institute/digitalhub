import { currentAdminUser, getCurrentPersonnel, getCurrentUserSession } from "#/app/auth";
import { LayoutClient } from "#/components/layout-client";
import { db } from "#/db/client";
import { ImplementerRole } from "#/db/enums";
import { fetchImplementerPersonnel, isCurrentUserAdmin } from "#/lib/actions/fetch-personnel";
import { canManageSurveys, projectsAdministeredBy } from "#/lib/auth/admin-access";

async function loadAdminProjects() {
  const session = await getCurrentUserSession();
  if (!session?.user?.id || !(await isCurrentUserAdmin())) {
    return null;
  }
  const userId = session.user.id;
  return db.query.project.findMany({
    where: (p, { inArray }) => inArray(p.id, projectsAdministeredBy(userId)),
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
  const canManageSurveysTab = adminUser !== null && canManageSurveys(adminUser.profile);
  return (
    <LayoutClient
      user={user}
      profile={userSession ?? null}
      isAdminUser={isAdminUser}
      isSuperAdmin={isSuperAdmin}
      canManageSurveys={canManageSurveysTab}
      adminProjects={adminProjects}
      personnel={personnel}
    >
      {children}
    </LayoutClient>
  );
}
