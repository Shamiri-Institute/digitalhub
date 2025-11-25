import { getCurrentUserSession } from "#/app/auth";
import GroupsDatatableSkeleton from "#/components/common/group/groups-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const userSession = await getCurrentUserSession();
  if (!userSession) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <GroupsDatatableSkeleton
      role={userSession?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
    />
  );
}
