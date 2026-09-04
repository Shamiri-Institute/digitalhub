import { ImplementerRole } from "@prisma/client";

import { requireLayoutRole } from "#/app/auth";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  await requireLayoutRole(ImplementerRole.OPERATIONS);
  return <div className="w-full self-stretch bg-white">{children}</div>;
}
