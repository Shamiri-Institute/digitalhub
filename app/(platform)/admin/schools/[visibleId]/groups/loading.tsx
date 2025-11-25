import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { getCurrentUserSession } from "#/app/auth";
import GroupsDatatableSkeleton from "#/components/common/group/groups-datatable-skeleton";

export default async function Loading() {
  const session = await getCurrentUserSession();
  if (session === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <GroupsDatatableSkeleton role={session?.user.activeMembership?.role ?? ImplementerRole.ADMIN} />
  );
}
