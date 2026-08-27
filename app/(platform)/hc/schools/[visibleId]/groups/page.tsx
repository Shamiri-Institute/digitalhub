import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentHubCoordinator } from "#/app/auth";
import SchoolGroupsPage from "#/components/common/schools/school-groups-page";

export default async function GroupsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolGroupsPage
      visibleId={visibleId}
      role={hubCoordinator?.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
    />
  );
}
