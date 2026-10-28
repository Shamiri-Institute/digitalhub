import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { copiesPageOf, PrintRunDetailView } from "#/components/common/survey/print-run-detail";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import { hubCoordinatorViewer } from "#/lib/auth/survey-access";
import { fetchPrintRun, fetchPrintRunCopies } from "#/lib/survey/print-run-queries";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export default async function HubPrintRunPage(props: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const viewer = await hubCoordinatorViewer();
  if (!viewer) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const [{ runId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const requestedPage = copiesPageOf(searchParams);

  const [run, timeZone] = await Promise.all([fetchPrintRun(viewer, runId), viewerTimeZone()]);
  if (!run) {
    notFound();
  }
  const copies = await fetchPrintRunCopies(viewer, run, requestedPage);

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
          runPath={`/hc/surveys/runs/${run.id}`}
          timeZone={timeZone}
        />
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
