import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PrintRunsTable } from "#/components/common/survey/print-runs-table";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { SurveyStatus } from "#/db/enums";
import { surveyScope } from "#/lib/auth/admin-access";
import { fetchPrintRuns } from "#/lib/survey/print-run-queries";
import { viewerTimeZone } from "#/lib/viewer-time-zone";
import { SurveyStatusBadge } from "../components/status-badges";
import { fetchSurveyWithVersions } from "../queries";
import VersionsDataTable from "./components/versions-datatable";

// Creating a print run inserts every copy and page in the action this page serves.
export const maxDuration = 300;

export default async function AdminSurveyPage(props: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await props.params;
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }
  const viewer = { kind: "project", ...scope } as const;

  const survey = await fetchSurveyWithVersions(surveyId, scope);
  if (!survey) {
    notFound();
  }
  const [runs, timeZone] = await Promise.all([fetchPrintRuns(viewer, survey.id), viewerTimeZone()]);
  const runsPath = `/admin/surveys/${survey.id}/runs`;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <Link
          href="/admin/surveys"
          className="flex items-center gap-1 text-sm font-medium text-shamiri-new-blue hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          Surveys
        </Link>
        <PageHeading title={survey.title}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-shamiri-text-grey">{survey.code}</span>
            <SurveyStatusBadge status={survey.status} />
          </div>
        </PageHeading>
        {survey.description && (
          <p className="text-sm text-shamiri-text-grey">{survey.description}</p>
        )}
        <Separator />
        <VersionsDataTable
          surveyId={survey.id}
          surveyCode={survey.code}
          versions={survey.versions}
          runsPath={survey.status === SurveyStatus.ACTIVE ? runsPath : undefined}
          timeZone={timeZone}
        />
        <section className="space-y-3 pt-6">
          <h2 className="text-lg font-semibold">Print runs</h2>
          <PrintRunsTable runs={runs} runsPath={runsPath} showHub timeZone={timeZone} />
        </section>
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
