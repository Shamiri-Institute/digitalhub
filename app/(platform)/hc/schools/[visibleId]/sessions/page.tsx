import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentHubCoordinator } from "#/app/auth";
import SchoolSessionsPage from "#/components/common/schools/school-sessions-page";

export default async function SessionsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolSessionsPage
      visibleId={visibleId}
      role={hubCoordinator?.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
    />
  );
}
