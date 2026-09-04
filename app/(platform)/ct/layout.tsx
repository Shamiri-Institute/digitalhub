import { ImplementerRole } from "@prisma/client";
import type React from "react";

import { requireLayoutRole } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";

export default async function ClinicalTeamLayout({ children }: { children: React.ReactNode }) {
  await requireLayoutRole(ImplementerRole.CLINICAL_TEAM);
  return (
    <div className="w-full self-stretch">
      <div className="container w-full grow bg-white py-10">{children}</div>
      <PageFooter />
    </div>
  );
}
