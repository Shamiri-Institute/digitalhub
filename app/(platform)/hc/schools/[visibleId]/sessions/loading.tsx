import { getCurrentUserSession } from "#/app/auth";
import SessionsDatatableSkeleton from "#/components/common/session/sessions-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const userSession = await getCurrentUserSession();
  if (!userSession) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SessionsDatatableSkeleton
      role={userSession?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
    />
  );
}
