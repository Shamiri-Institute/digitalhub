import { signOut } from "next-auth/react";
import type React from "react";
import { currentAdminUser } from "#/app/auth";
import SchoolLeftPanel from "#/components/common/schools/school-left-panel";
import SchoolsBreadcrumb from "#/components/common/schools/schools-breadcrumb";
import SchoolsNav from "#/components/common/schools/schools-nav";
import PageFooter from "#/components/ui/page-footer";
import { Separator } from "#/components/ui/separator";

export default async function SchoolViewLayout({ children }: { children: React.ReactNode }) {
  const admin = await currentAdminUser();
  if (admin === null) {
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex h-full bg-white">
      <div className="hidden lg:flex lg:w-1/4">
        <SchoolLeftPanel open={true} role={admin?.session?.user.activeMembership?.role} />
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
