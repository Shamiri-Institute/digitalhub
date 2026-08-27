import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import SchoolSupervisorsPage from "#/components/common/schools/school-supervisors-page";

export default async function SupervisorsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolSupervisorsPage
      visibleId={visibleId}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
