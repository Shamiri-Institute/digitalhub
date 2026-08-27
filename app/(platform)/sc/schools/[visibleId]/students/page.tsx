import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentSupervisor } from "#/app/auth";
import SchoolStudentsPage from "#/components/common/schools/school-students-page";

export default async function StudentsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolStudentsPage
      visibleId={visibleId}
      role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
    />
  );
}
