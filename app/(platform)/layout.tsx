import { redirect } from "next/navigation";

import { getCurrentPersonnel } from "#/app/auth";
import { LayoutClient } from "#/components/layout-client";
import { getCachedSession } from "#/lib/auth-options";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await getCachedSession();
  if (!session?.user.activeMembership) {
    redirect("/");
  }

  const userSession = await getCurrentPersonnel();
  return (
    <LayoutClient session={userSession?.session ?? null} profile={userSession ?? null}>
      {children}
    </LayoutClient>
  );
}
