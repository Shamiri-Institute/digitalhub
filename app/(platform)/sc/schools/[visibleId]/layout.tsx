import { ImplementerRole } from "#/db/enums";
import { signOut } from "next-auth/react";
import type React from "react";
import { currentSupervisorLite } from "#/app/auth";
import SchoolViewLayout from "#/components/common/schools/school-view-layout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supervisor = await currentSupervisorLite();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolViewLayout
      role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
    >
      {children}
    </SchoolViewLayout>
  );
}
