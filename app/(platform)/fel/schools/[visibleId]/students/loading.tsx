import { getCurrentUser } from "#/app/auth";
import StudentsDatatableSkeleton from "#/components/common/student/students-datatable-skeleton";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const user = await getCurrentUser();
  if (!user) {
    await signOut({ callbackUrl: "/login" });
  }
  return <StudentsDatatableSkeleton role={user?.membership.role!} />;
}
