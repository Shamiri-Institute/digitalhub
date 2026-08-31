import { ImplementerRole } from "@prisma/client";
import { signOut } from "next-auth/react";
import { currentSupervisor } from "#/app/auth";
import SchoolSessionsPage from "#/components/common/schools/school-sessions-page";

export default async function SessionsPage(props: { params: Promise<{ visibleId: string }> }) {
  const { visibleId } = await props.params;
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }
  return (
    <SchoolSessionsPage
      visibleId={visibleId}
      role={supervisor?.session?.user.activeMembership?.role ?? ImplementerRole.SUPERVISOR}
      supervisorId={supervisor?.profile?.id}
    />
  );
}
