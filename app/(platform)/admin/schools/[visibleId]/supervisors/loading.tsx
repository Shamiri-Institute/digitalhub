import { getCurrentUserSession } from "#/app/auth";
import SupervisorsDatatableSkeleton from "#/components/common/supervisor/supervisors-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const session = await getCurrentUserSession();
  if (!session) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SupervisorsDatatableSkeleton
      role={session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
