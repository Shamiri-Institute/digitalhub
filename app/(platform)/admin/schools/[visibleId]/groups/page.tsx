import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentAdminUser } from "#/app/auth";
import SchoolGroupsPage from "#/components/common/schools/school-groups-page";

export default async function GroupsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }
  return (
    <SchoolGroupsPage
      visibleId={visibleId}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
