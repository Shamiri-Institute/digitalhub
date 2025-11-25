import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { getCurrentUserSession } from "#/app/auth";
import FellowsDatatableSkeleton from "#/components/common/fellow/fellows-datatable-skeleton";

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
