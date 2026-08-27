import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentSupervisor } from "#/app/auth";
import SchoolGroupsPage from "#/components/common/schools/school-groups-page";

export default async function GroupsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolGroupsPage
      visibleId={visibleId}
      role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
    />
  );
}
