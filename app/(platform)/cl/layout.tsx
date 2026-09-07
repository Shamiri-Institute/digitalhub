import type React from "react";
import PageFooter from "#/components/ui/page-footer";

export default async function ClinicalLeadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col self-stretch">
      <div className="container flex min-h-0 w-full flex-1 flex-col bg-white py-10">{children}</div>
      <PageFooter />
    </div>
  );
}
