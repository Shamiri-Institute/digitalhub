import { ImplementerRole } from "@prisma/client";
import type React from "react";

import { requireLayoutRole } from "#/app/auth";

export default async function HubCoordinatorLayout({ children }: { children: React.ReactNode }) {
  await requireLayoutRole(ImplementerRole.HUB_COORDINATOR);
  return <div className="w-full self-stretch">{children}</div>;
}
