import { getCurrentUserSession } from "#/app/auth";
import FellowsDatatableSkeleton from "#/components/common/fellow/fellows-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const session = await getCurrentUserSession();
  if (!session) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <FellowsDatatableSkeleton
      role={session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
