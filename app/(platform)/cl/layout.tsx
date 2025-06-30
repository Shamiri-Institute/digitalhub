import type React from "react";
import PageFooter from "#/components/ui/page-footer";

export default async function ClinicalLeadLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full self-stretch">
      <div className="container w-full grow bg-white py-10">{children}</div>
      <PageFooter />
    </div>
  );
}
