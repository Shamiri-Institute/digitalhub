import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { researchScope } from "#/lib/auth/research-access";
import { SurveyStatusBadge } from "../components/status-badges";
import { fetchSurveyWithVersions } from "../queries";
import VersionsDataTable from "./components/versions-datatable";

export default async function ResearchSurveyPage(props: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await props.params;
  const scope = await researchScope();
  if (!scope) {
    redirect("/login");
  }

  const survey = await fetchSurveyWithVersions(surveyId, scope);
  if (!survey) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3">
        <Link
          href="/res/survey"
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
        <VersionsDataTable surveyId={survey.id} versions={survey.versions} />
      </div>
    </div>
  );
}
