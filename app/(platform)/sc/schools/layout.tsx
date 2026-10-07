import { signOut } from "next-auth/react";
import type { ReactNode } from "react";
import { currentSupervisorLite } from "#/app/auth";

export default async function SupervisorSchoolData({ children }: { children: ReactNode }) {
  const supervisor = await currentSupervisorLite();
  if (supervisor === null) {
    await signOut({ callbackUrl: "/login" });
  }

  if (!supervisor?.profile?.hubId) {
    return <div>Supervisor has no assigned hub</div>;
  }

  return <div className="w-full self-stretch">{children}</div>;
}
