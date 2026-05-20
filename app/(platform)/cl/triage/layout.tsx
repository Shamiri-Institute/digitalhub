import type React from "react";
import RenderClTriageTabs from "#/app/(platform)/cl/triage/components/render-cl-triage-tabs";
import { Separator } from "#/components/ui/separator";

export default function ClTriageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-5">
      <RenderClTriageTabs />
      <Separator />
      {children}
    </div>
  );
}
