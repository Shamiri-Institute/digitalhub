import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentSupervisor } from "#/app/auth";
import SchoolFellowsPage from "#/components/common/schools/school-fellows-page";

export default async function FellowsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolFellowsPage
      visibleId={visibleId}
      role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
    />
  );
}
