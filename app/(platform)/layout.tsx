import { getCurrentPersonnel } from "#/app/auth";
import { LayoutClient } from "#/components/layout-client";
import { ImplementerRole } from "#/db/enums";
import { isCurrentUserAdmin } from "#/lib/actions/fetch-personnel";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [userSession, isAdminEmail] = await Promise.all([
    getCurrentPersonnel(),
    isCurrentUserAdmin(),
  ]);
  const user = userSession?.session.user ?? null;
  const isAdminUser = isAdminEmail || user?.activeMembership?.role === ImplementerRole.ADMIN;
  return (
    <LayoutClient user={user} profile={userSession ?? null} isAdminUser={isAdminUser}>
      {children}
    </LayoutClient>
  );
}
