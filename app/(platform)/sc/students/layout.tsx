import type { ReactNode } from "react";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";

export default function SupervisorStudentsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container w-full grow space-y-3 py-10">
      <PageHeading title="Students" />
      <Separator />
      {children}
    </div>
  );
}
