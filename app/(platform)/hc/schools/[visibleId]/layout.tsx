import { currentHubCoordinator, getCurrentUser } from "#/app/auth";
import SchoolLeftPanel from "#/components/common/schools/school-left-panel";
import SchoolsBreadcrumb from "#/components/common/schools/schools-breadcrumb";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";
import { signOut } from "next-auth/react";
import React from "react";
import SchoolsNav from "../../../../../components/common/schools/schools-nav";

export default async function SchoolViewLayout({ children }: { children: React.ReactNode }) {
  const hubCoordinator = await currentHubCoordinator();
  if (hubCoordinator === null) {
    await signOut({ callbackUrl: "/login" });
  }
  if (!hubCoordinator?.assignedHubId) {
    return <div>Hub coordinator has no assigned hub</div>;
  }

  const user = await getCurrentUser();

  return (
    <div className="flex h-full bg-white">
      <div className="hidden lg:flex lg:w-1/4">
        <SchoolLeftPanel open={true} role={user?.membership?.role} />
      </div>
      <div className="flex flex-1 flex-col">
        <div className="container w-full grow space-y-5 pb-6 pl-6 pr-8 pt-5">
          <SchoolsBreadcrumb />
          <SchoolsNav />
          <Separator />
          {children}
        </div>
        <PageFooter />
      </div>
    </div>
  );
}
