import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentAdminUser } from "#/app/auth";
import SchoolStudentsPage from "#/components/common/schools/school-students-page";

export default async function StudentsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolStudentsPage
      visibleId={visibleId}
      role={admin?.session?.user.activeMembership?.role ?? ImplementerRole.ADMIN}
    />
  );
}
