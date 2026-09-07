import { redirect } from "next/navigation";

import { getCurrentUserSession } from "#/app/auth";
import { roleHome } from "#/lib/auth/role-home";

export default async function RootPage() {
  const session = await getCurrentUserSession();
  if (!session?.user.activeMembership) {
    redirect("/login");
  }
  redirect(roleHome[session.user.activeMembership.role]);
}
