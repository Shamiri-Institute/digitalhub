import ReportingTabNav from "#/app/(platform)/hc/reporting/components/reporting-tabs-nav";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import React from "react";

export default async function SchoolViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hubCoordinator = await currentHubCoordinator();

  if (!hubCoordinator) {
    return <InvalidPersonnelRole role="hub-coordinator" />;
  }

  return (
    <div className="flex h-full bg-white">
      <div className="flex flex-1 flex-col">
        <div className="container w-full grow space-y-5 pb-6 pl-6 pr-8 pt-5">
          <ReportingTabNav />
          <Separator />
          {children}
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
