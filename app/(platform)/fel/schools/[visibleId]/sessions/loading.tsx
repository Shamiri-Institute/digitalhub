import { signOut } from "next-auth/react";
import { getCurrentUserSession } from "#/app/auth";
import SessionsDatatableSkeleton from "#/components/common/session/sessions-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";

export default async function Loading() {
  const userSession = await getCurrentUserSession();
  if (!userSession) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SessionsDatatableSkeleton
      role={userSession?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
    />
  );
}
