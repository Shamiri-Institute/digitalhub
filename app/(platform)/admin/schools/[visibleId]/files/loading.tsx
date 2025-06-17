import { getCurrentUser } from "#/app/auth";
import FilesDatatableSkeleton from "#/components/common/file/files-datatable-skeleton";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const user = await getCurrentUser();
  if (!user) {
    await signOut({ callbackUrl: "/login" });
  }
  return <FilesDatatableSkeleton role={user?.membership.role!} />;
}
