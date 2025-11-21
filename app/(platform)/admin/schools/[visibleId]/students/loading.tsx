import { getCurrentUserSession } from "#/app/auth";
import StudentsDatatableSkeleton from "#/components/common/student/students-datatable-skeleton";
import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";

export default async function Loading() {
  const session = await getCurrentUserSession();
  if (session === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return <StudentsDatatableSkeleton role={session?.user.activeMembership?.role ?? ImplementerRole.ADMIN} />;
}
