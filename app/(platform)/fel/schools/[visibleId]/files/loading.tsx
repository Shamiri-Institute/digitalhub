import { signOut } from "next-auth/react";
import { getCurrentUserSession } from "#/app/auth";
import FilesDatatableSkeleton from "#/components/common/files/files-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";

export default async function Loading() {
  const userSession = await getCurrentUserSession();
  if (!userSession) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <FilesDatatableSkeleton
      role={userSession?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
    />
  );
}
