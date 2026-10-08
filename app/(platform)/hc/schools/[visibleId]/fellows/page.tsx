import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentHubCoordinator } from "#/app/auth";
import SchoolFellowsPage from "#/components/common/schools/school-fellows-page";

export default async function FellowsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    redirect("/login");
  }
  return (
    <SchoolFellowsPage
      visibleId={visibleId}
      role={hubCoordinator?.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
      hideActions={true}
    />
  );
}
