import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import SchoolGroupsPage from "#/components/common/schools/school-groups-page";

export default async function GroupsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolGroupsPage
      visibleId={visibleId}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
