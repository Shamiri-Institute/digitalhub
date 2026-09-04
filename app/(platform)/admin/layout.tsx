import { ImplementerRole } from "@prisma/client";
import type React from "react";

import { requireLayoutRole } from "#/app/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireLayoutRole(ImplementerRole.ADMIN);
  return <div className="w-full self-stretch">{children}</div>;
}
