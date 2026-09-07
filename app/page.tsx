import { ImplementerRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCurrentUserSession } from "#/app/auth";

const HOME: Record<ImplementerRole, string> = {
  [ImplementerRole.HUB_COORDINATOR]: "/hc",
  [ImplementerRole.SUPERVISOR]: "/sc",
  [ImplementerRole.FELLOW]: "/fel",
  [ImplementerRole.CLINICAL_LEAD]: "/cl",
  [ImplementerRole.OPERATIONS]: "/ops",
  [ImplementerRole.CLINICAL_TEAM]: "/ct",
  [ImplementerRole.ADMIN]: "/admin",
};

export default async function RootPage() {
  const session = await getCurrentUserSession();
  if (!session?.user.activeMembership) {
    redirect("/login");
  }
  redirect(HOME[session.user.activeMembership.role]);
}
