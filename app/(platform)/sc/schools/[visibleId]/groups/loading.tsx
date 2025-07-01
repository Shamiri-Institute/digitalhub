import { signOut } from "next-auth/react";
import { getCurrentUser } from "#/app/auth";
import GroupsDatatableSkeleton from "#/components/common/group/groups-datatable-skeleton";

export default async function Loading() {
  const user = await getCurrentUser();
  if (!user) {
    await signOut({ callbackUrl: "/login" });
  }
  return <GroupsDatatableSkeleton role={user?.membership.role!} />;
}
