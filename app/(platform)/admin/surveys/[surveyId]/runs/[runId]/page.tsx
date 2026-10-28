import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { copiesPageOf, PrintRunDetailView } from "#/components/common/survey/print-run-detail";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import { surveyScope } from "#/lib/auth/admin-access";
import { fetchPrintRun, fetchPrintRunCopies } from "#/lib/survey/print-run-queries";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export default async function AdminPrintRunPage(props: {
  params: Promise<{ surveyId: string; runId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }
  const [{ surveyId, runId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const requestedPage = copiesPageOf(searchParams);
  const viewer = { kind: "project", ...scope } as const;

  const [run, timeZone] = await Promise.all([fetchPrintRun(viewer, runId), viewerTimeZone()]);
  if (!run || run.version.survey.id !== surveyId) {
    notFound();
  }
  const copies = await fetchPrintRunCopies(viewer, run, requestedPage);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <Link
          href={`/admin/surveys/${surveyId}`}
          className="flex items-center gap-1 text-sm font-medium text-shamiri-new-blue hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          {run.version.survey.title}
        </Link>
        <PrintRunDetailView
          run={run}
          copies={copies}
          runPath={`/admin/surveys/${surveyId}/runs/${run.id}`}
          timeZone={timeZone}
        />
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
