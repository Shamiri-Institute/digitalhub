import { signOut } from "next-auth/react";
import { getCurrentUser } from "#/app/auth";
import FilesDatatableSkeleton from "#/components/common/files/files-datatable-skeleton";

export default async function Loading() {
  const user = await getCurrentUser();
  if (!user) {
    await signOut({ callbackUrl: "/login" });
  }
  return <FilesDatatableSkeleton role={user?.membership.role!} />;
}
