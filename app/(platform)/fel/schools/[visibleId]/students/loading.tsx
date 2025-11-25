import { signOut } from "next-auth/react";
import { getCurrentUserSession } from "#/app/auth";
import StudentsDatatableSkeleton from "#/components/common/student/students-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";

export default async function Loading() {
  const userSession = await getCurrentUserSession();
  if (!userSession) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <StudentsDatatableSkeleton
      role={userSession?.user.activeMembership?.role ?? ImplementerRole.FELLOW}
    />
  );
}
