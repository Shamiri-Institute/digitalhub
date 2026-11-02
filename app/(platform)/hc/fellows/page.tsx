import { redirect } from "next/navigation";
import { Suspense } from "react";

import GraphLoadingIndicator from "#/app/(platform)/hc/components/graph-loading-indicator";
import FellowsChartsWrapper from "#/app/(platform)/hc/fellows/components/fellows-charts-wrapper";
import FellowsTable from "#/app/(platform)/hc/fellows/components/fellows-table";
import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { ImplementerRole } from "#/db/enums";

export default async function FellowPage() {
  const hc = await currentHubCoordinator();
  if (!hc) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const hubId = hc.profile.assignedHubId;
  if (!hubId) {
    redirect("/login");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Fellows" />
        <Separator />

        <Suspense fallback={<GraphLoadingIndicator />}>
          <FellowsChartsWrapper coordinator={{ assignedHubId: hubId }} />
        </Suspense>
        <FellowsTable
          hubId={hubId}
          role={hc.session?.user.activeMembership?.role ?? ImplementerRole.HUB_COORDINATOR}
        />
      </div>
      <PageFooter />
    </div>
  );
}
