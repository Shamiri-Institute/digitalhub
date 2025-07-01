import { signOut } from "next-auth/react";
import { getCurrentUser } from "#/app/auth";
import FellowsDatatableSkeleton from "#/components/common/fellow/fellows-datatable-skeleton";

export default async function Loading() {
  const user = await getCurrentUser();
  if (!user) {
    await signOut({ callbackUrl: "/login" });
  }
  return <FellowsDatatableSkeleton role={user?.membership.role!} />;
}
