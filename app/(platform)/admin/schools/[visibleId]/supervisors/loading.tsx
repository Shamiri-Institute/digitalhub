import { getCurrentUser } from "#/app/auth";
import SupervisorsDatatableSkeleton from "#/components/common/supervisor/supervisors-datatable-skeleton";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const user = await getCurrentUser();
  if (!user) {
    await signOut({ callbackUrl: "/login" });
  }
  return <SupervisorsDatatableSkeleton role={user?.membership.role!} />;
}
