import { getCurrentUserSession } from "#/app/auth";
import SessionsDatatableSkeleton from "#/components/common/session/sessions-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const session = await getCurrentUserSession();
  if (!session) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SessionsDatatableSkeleton
      role={session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
