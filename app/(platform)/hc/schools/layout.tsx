import { signOut } from "next-auth/react";
import type React from "react";
import { currentHubCoordinator } from "#/app/auth";

export default async function SchoolsLayout({ children }: { children: React.ReactNode }) {
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const assignedHubId = coordinator?.profile?.assignedHubId;
  if (!assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }
  return <div className="w-full self-stretch">{children}</div>;
}
