import { ImplementerRole } from "@prisma/client";
import type React from "react";

import { requireLayoutRole } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";

export default async function ClinicalLeadLayout({ children }: { children: React.ReactNode }) {
  await requireLayoutRole(ImplementerRole.CLINICAL_LEAD);
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col self-stretch">
      <div className="container flex min-h-0 w-full flex-1 flex-col bg-white py-10">{children}</div>
      <PageFooter />
    </div>
  );
}
