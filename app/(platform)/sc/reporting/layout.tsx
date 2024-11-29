import RenderSCReportingTabs from "#/app/(platform)/sc/reporting/components/render-reporting-tabs";
import { currentSupervisor } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { signOut } from "next-auth/react";
import React from "react";

export default async function ReportingViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supervisor = await currentSupervisor();

  if (!supervisor) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex h-full bg-white">
      <div className="flex flex-1 flex-col">
        <div className="container w-full grow space-y-5 pb-6 pl-6 pr-8 pt-5">
          <RenderSCReportingTabs />
          <Separator />
          {children}
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
