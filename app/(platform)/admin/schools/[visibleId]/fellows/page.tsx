import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentAdminUser } from "#/app/auth";
import SchoolFellowsPage from "#/components/common/schools/school-fellows-page";

export default async function FellowsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }
  return (
    <SchoolFellowsPage
      visibleId={visibleId}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
      hideActions={true}
    />
  );
}
