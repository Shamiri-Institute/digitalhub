import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import type React from "react";
import { currentHubCoordinator } from "#/app/auth";
import SchoolViewLayout from "#/components/common/schools/school-view-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  const assignedHubId = hubCoordinator?.profile?.assignedHubId;
  if (!assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }
  return (
    <SchoolViewLayout
      role={hubCoordinator?.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
    >
      {children}
    </SchoolViewLayout>
  );
}
