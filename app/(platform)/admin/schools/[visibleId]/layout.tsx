import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import type React from "react";
import { currentAdminUser } from "#/app/auth";
import SchoolViewLayout from "#/components/common/schools/school-view-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolViewLayout role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}>
      {children}
    </SchoolViewLayout>
  );
}
