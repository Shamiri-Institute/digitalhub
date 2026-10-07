import { getCurrentPersonnel } from "#/app/auth";
import { LayoutClient } from "#/components/layout-client";
import { ImplementerRole } from "#/db/enums";
import { isCurrentUserAdmin } from "#/lib/actions/fetch-personnel";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const [userSession, isAdminEmail] = await Promise.all([
    getCurrentPersonnel(),
    isCurrentUserAdmin(),
  ]);
  const session = userSession?.session ?? null;
  const isAdminUser =
    isAdminEmail || session?.user?.activeMembership?.role === ImplementerRole.ADMIN;
  return (
    <LayoutClient session={session} profile={userSession ?? null} isAdminUser={isAdminUser}>
      {children}
    </LayoutClient>
  );
}
