import type { ImplementerRole } from "@prisma/client";
import type React from "react";
import SchoolLeftPanel from "#/components/common/schools/school-left-panel";
import SchoolsBreadcrumb from "#/components/common/schools/schools-breadcrumb";
import SchoolsNav from "#/components/common/schools/schools-nav";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";

export default function SchoolViewLayout({
  role,
  children,
}: {
  role: ImplementerRole;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full bg-white">
      <div className="hidden lg:flex lg:w-1/4">
        <SchoolLeftPanel open={true} role={role} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="container w-full min-w-0 grow space-y-5 pb-6 pl-6 pr-8 pt-5">
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
