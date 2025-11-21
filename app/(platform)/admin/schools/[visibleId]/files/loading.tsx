import { getCurrentUserSession } from "#/app/auth";
import FilesDatatableSkeleton from "#/components/common/file/files-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const session = await getCurrentUserSession();
  if (!session) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <FilesDatatableSkeleton role={session?.user.activeMembership?.role ?? ImplementerRole.ADMIN} />
  );
}
