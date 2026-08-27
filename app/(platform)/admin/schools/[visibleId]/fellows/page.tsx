import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import SchoolFellowsPage from "#/components/common/schools/school-fellows-page";

export default async function FellowsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolFellowsPage
      visibleId={visibleId}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
      hideActions={true}
    />
  );
}
