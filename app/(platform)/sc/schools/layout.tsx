import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { currentSupervisor } from "#/app/auth";

export default async function SupervisorSchoolData({ children }: { children: ReactNode }) {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!supervisor?.profile?.hubId) {
    return <div>Supervisor has no assigned hub</div>;
  }

  return <div className="w-full self-stretch">{children}</div>;
}
