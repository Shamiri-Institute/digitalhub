import { redirect } from "next/navigation";

import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { PrintRunsTable } from "#/components/common/survey/print-runs-table";
import { PrintableVersionsTable } from "#/components/common/survey/printable-versions-table";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { hubCoordinatorViewer } from "#/lib/auth/survey-access";
import {
  fetchPrintableHubs,
  fetchPrintableVersions,
  fetchPrintRuns,
} from "#/lib/survey/print-run-queries";

// Creating a print run inserts every copy and page in the action this page serves.
export const maxDuration = 300;

const RUNS_PATH = "/hc/surveys/runs";

export default async function HubSurveysPage() {
  const coordinator = await currentHubCoordinator();
  if (!coordinator) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const viewer = await hubCoordinatorViewer();
  if (!viewer) {
    redirect("/login");
  }

  const [versions, hubs, runs] = await Promise.all([
    fetchPrintableVersions(viewer),
    fetchPrintableHubs(viewer),
    fetchPrintRuns(viewer),
  ]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Surveys" />
        <Separator />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Ready to print</h2>
          <PrintableVersionsTable versions={versions} hubs={hubs} runsPath={RUNS_PATH} />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Print runs</h2>
          <PrintRunsTable runs={runs} runsPath={RUNS_PATH} showHub={false} />
        </section>
      </div>
      <PageFooter />
    </div>
  );
}
