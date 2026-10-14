import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { surveyScope } from "#/lib/auth/admin-access";
import { SurveyStatusBadge } from "../components/status-badges";
import { fetchSurveyWithVersions } from "../queries";
import VersionsDataTable from "./components/versions-datatable";

export default async function AdminSurveyPage(props: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await props.params;
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }

  const survey = await fetchSurveyWithVersions(surveyId, scope);
  if (!survey) {
    notFound();
  }

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
        <VersionsDataTable surveyId={survey.id} versions={survey.versions} />
      </div>
      <PageFooter />
    </div>
  );
}
