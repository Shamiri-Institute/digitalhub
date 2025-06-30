import RenderOpsReportingTabs from "#/app/(platform)/ops/components/render-reporting-tabs";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import type React from "react";

export default async function ReportingViewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full bg-white">
      <div className="flex flex-1 flex-col">
        <div className="container w-full grow space-y-5 pb-6 pl-6 pr-8 pt-5">
          <RenderOpsReportingTabs />
          <Separator />
          {children}
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
