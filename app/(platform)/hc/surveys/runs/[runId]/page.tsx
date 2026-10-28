import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { currentHubCoordinator } from "#/app/auth";
import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { copiesPageOf, PrintRunDetailView } from "#/components/common/survey/print-run-detail";
import PageFooter from "#/components/ui/page-footer";
import { hubCoordinatorViewer } from "#/lib/auth/survey-access";
import { fetchPrintRun, fetchPrintRunCopies } from "#/lib/survey/print-run-queries";

export default async function HubPrintRunPage(props: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const coordinator = await currentHubCoordinator();
  if (!coordinator) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const viewer = await hubCoordinatorViewer();
  if (!viewer) {
    redirect("/login");
  }
  const [{ runId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const page = copiesPageOf(searchParams);

  const [run, copies] = await Promise.all([
    fetchPrintRun(viewer, runId),
    fetchPrintRunCopies(viewer, runId, page),
  ]);
  if (!run) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <Link
          href="/hc/surveys"
          className="flex items-center gap-1 text-sm font-medium text-shamiri-new-blue hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Surveys
        </Link>
        <PrintRunDetailView
          run={run}
          copies={copies}
          page={page}
          runPath={`/hc/surveys/runs/${run.id}`}
        />
      </div>
      <PageFooter />
    </div>
  );
}
