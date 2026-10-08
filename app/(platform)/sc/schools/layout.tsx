import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { currentSupervisor } from "#/app/auth";

export default async function SupervisorSchoolData({ children }: { children: ReactNode }) {
  const supervisor = await currentSupervisor();
  if (supervisor === null) {
    redirect("/login");
  }

  if (!supervisor?.profile?.hubId) {
    return <div>Supervisor has no assigned hub</div>;
  }

  return <div className="w-full self-stretch">{children}</div>;
}
