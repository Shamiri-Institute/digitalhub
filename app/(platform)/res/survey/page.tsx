import { redirect } from "next/navigation";

import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { researchScope } from "#/lib/auth/research-access";
import SurveysDataTable from "./components/surveys-datatable";
import { fetchSurveys } from "./queries";

export default async function ResearchSurveysPage() {
  const scope = await researchScope();
  if (!scope) {
    redirect("/login");
  }

  const surveys = await fetchSurveys(scope);

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-3">
        <PageHeading title="Surveys" />
        <Separator />
        <SurveysDataTable surveys={surveys} />
      </div>
    </div>
  );
}
