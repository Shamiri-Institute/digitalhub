import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getCurrentPersonnel, getCurrentUserSession } from "#/app/auth";
import { LayoutClient } from "#/components/layout-client";
import { roleHome } from "#/lib/auth/role-home";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  // Set by proxy.ts; the proxy itself cannot reach the database (see its doc comment).
  const path = (await headers()).get("x-pathname");
  const session = await getCurrentUserSession();
  const role = session?.user.activeMembership?.role;
  if (!role) {
    redirect(path ? `/login?next=${encodeURIComponent(path)}` : "/login");
  }

  const home = roleHome[role];
  if (path && path !== home && !path.startsWith(`${home}/`)) {
    redirect(home);
  }

  const userSession = await getCurrentPersonnel();
  return (
    <LayoutClient session={userSession?.session ?? null} profile={userSession ?? null}>
      {children}
    </LayoutClient>
  );
}
