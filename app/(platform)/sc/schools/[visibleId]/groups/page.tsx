import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentSupervisor } from "#/app/auth";
import SchoolGroupsPage from "#/components/common/schools/school-groups-page";

export default async function GroupsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    redirect("/login");
  }
  return (
    <SchoolGroupsPage
      visibleId={visibleId}
      role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
    />
  );
}
