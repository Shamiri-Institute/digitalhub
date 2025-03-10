import { getCurrentUser } from "#/app/auth";
import SessionsDatatableSkeleton from "#/components/common/session/sessions-datatable-skeleton";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const user = await getCurrentUser();
  if (!user) {
    await signOut({ callbackUrl: "/login" });
  }
  return <SessionsDatatableSkeleton role={user?.membership.role!} />;
}
