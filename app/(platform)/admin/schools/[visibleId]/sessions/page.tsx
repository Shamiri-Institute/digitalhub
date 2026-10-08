import { ImplementerRole } from "#/db/enums";
import { redirect } from "next/navigation";
import { currentAdminUser } from "#/app/auth";
import SchoolSessionsPage from "#/components/common/schools/school-sessions-page";

export default async function SessionsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const admin = await currentAdminUser();
  if (admin === null) {
    redirect("/login");
  }
  return (
    <SchoolSessionsPage
      visibleId={visibleId}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
