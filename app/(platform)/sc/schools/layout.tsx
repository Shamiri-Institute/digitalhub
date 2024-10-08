import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { ReactNode } from "react";

export default function SupervisorSchoolData({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Schools" />
        <Separator />
      </div>
      {children}
      <PageFooter />
    </div>
  );
}
