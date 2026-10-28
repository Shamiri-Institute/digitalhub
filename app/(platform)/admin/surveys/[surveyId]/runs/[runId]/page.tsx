import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { copiesPageOf, PrintRunDetailView } from "#/components/common/survey/print-run-detail";
import PageFooter from "#/components/ui/page-footer";
import { surveyScope } from "#/lib/auth/admin-access";
import { fetchPrintRun, fetchPrintRunCopies } from "#/lib/survey/print-run-queries";

export default async function AdminPrintRunPage(props: {
  params: Promise<{ surveyId: string; runId: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }
  const [{ surveyId, runId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const page = copiesPageOf(searchParams);
  const viewer = { kind: "project", ...scope } as const;

  const [run, copies] = await Promise.all([
    fetchPrintRun(viewer, runId),
    fetchPrintRunCopies(viewer, runId, page),
  ]);
  if (!run || run.version.survey.id !== surveyId) {
    notFound();
  }

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
          page={page}
          runPath={`/admin/surveys/${surveyId}/runs/${run.id}`}
        />
      </div>
      <PageFooter />
    </div>
  );
}
