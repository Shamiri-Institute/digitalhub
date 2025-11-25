import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { getCurrentUserSession } from "#/app/auth";
import FellowsDatatableSkeleton from "#/components/common/fellow/fellows-datatable-skeleton";

export default async function Loading() {
  const userSession = await getCurrentUserSession();
  if (!userSession) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <FellowsDatatableSkeleton
      role={userSession?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
    />
  );
}
