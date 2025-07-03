import { currentHubCoordinator } from "#/app/auth";
import { signOut } from "next-auth/react";
import React from "react";

export default async function SchoolsLayout({ children }: { children: React.ReactNode }) {
  const coordinator = await currentHubCoordinator();
  if (coordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  if (!coordinator?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }
  return (
    <div className="w-full self-stretch">
      {children}
    </div>
  );
}
