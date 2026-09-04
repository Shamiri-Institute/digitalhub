import { ImplementerRole } from "@prisma/client";
import type React from "react";

import { requireLayoutRole } from "#/app/auth";

export default async function SupervisorLayout({ children }: { children: React.ReactNode }) {
  await requireLayoutRole(ImplementerRole.SUPERVISOR);
  return <div className="w-full self-stretch bg-white">{children}</div>;
}
