import { signOut } from "next-auth/react";
import { getCurrentUserSession } from "#/app/auth";
import GroupsDatatableSkeleton from "#/components/common/group/groups-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";

export default async function Loading() {
  const userSession = await getCurrentUserSession();
  if (!userSession) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <GroupsDatatableSkeleton
      role={userSession?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
      rows={1}
    />
  );
}
