import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { SurveyVersionStatus } from "#/db/enums";
import { surveyScope } from "#/lib/auth/admin-access";
import { SurveyVersionStatusBadge } from "../../../components/status-badges";
import { fetchVersionForBuilder } from "../../../queries";
import SurveyBuilder from "./components/survey-builder";

export default async function SurveyVersionPage(props: {
  params: Promise<{ surveyId: string; versionNumber: string }>;
}) {
  const { surveyId, versionNumber } = await props.params;
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }

  const number = Number(versionNumber);
  const data = Number.isInteger(number)
    ? await fetchVersionForBuilder(surveyId, number, scope)
    : undefined;
  if (!data) {
    notFound();
  }
  const { survey, version, locked } = data;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <Link
          href={`/admin/surveys/${survey.id}`}
          className="flex items-center gap-1 text-sm font-medium text-shamiri-new-blue hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          {survey.title}
        </Link>
        <PageHeading title={`Version ${version.versionNumber}`}>
          <div className="flex items-center gap-3">
            <span className="text-sm text-shamiri-text-grey">{survey.code}</span>
            <SurveyVersionStatusBadge status={version.status} />
          </div>
        </PageHeading>
        {/* Keyed by status, so publishing starts the builder afresh from what was stored. */}
        <SurveyBuilder
          key={`${version.id}:${version.status}`}
          surveyCode={survey.code}
          version={version}
          locked={locked}
          editable={version.status === SurveyVersionStatus.DRAFT}
        />
      </div>
      <PageFooter />
    </div>
  );
}
