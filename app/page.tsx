import { ImplementerRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { getCachedSession } from "#/lib/auth-options";
import { db } from "#/lib/db";

const HOME: Record<ImplementerRole, string> = {
  [ImplementerRole.HUB_COORDINATOR]: "/hc",
  [ImplementerRole.SUPERVISOR]: "/sc",
  [ImplementerRole.FELLOW]: "/fel",
  [ImplementerRole.CLINICAL_LEAD]: "/cl",
  [ImplementerRole.OPERATIONS]: "/ops",
  [ImplementerRole.CLINICAL_TEAM]: "/ct",
  [ImplementerRole.ADMIN]: "/admin",
};

/**
 * Post-login landing. Sends the user to the dashboard for their active membership, which the
 * session callback derived from the database.
 */
export default async function RootPage() {
  const session = await getCachedSession();
  if (!session?.user.id) {
    redirect("/login");
  }

  const role = session.user.activeMembership?.role;
  if (!role) {
    // No membership in the active project: end the user's sessions rather than leave a cookie
    // that opens nothing.
    await db.session.deleteMany({ where: { userId: session.user.id } });
    redirect(`/login?error=${encodeURIComponent("No active membership for this account")}`);
  }

  redirect(HOME[role]);
}
