import { getCurrentUserSession } from "#/app/auth";
import StudentsDatatableSkeleton from "#/components/common/student/students-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const userSession = await getCurrentUserSession();
  if (!userSession) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <StudentsDatatableSkeleton
      role={userSession?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
    />
  );
}
