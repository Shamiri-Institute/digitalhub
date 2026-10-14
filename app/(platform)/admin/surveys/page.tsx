import { redirect } from "next/navigation";

import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { surveyScope } from "#/lib/auth/admin-access";
import SurveysDataTable from "./components/surveys-datatable";
import { fetchSurveys } from "./queries";

export default async function AdminSurveysPage() {
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }

  const surveys = await fetchSurveys(scope);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-3 py-10">
        <PageHeading title="Surveys" />
        <Separator />
        <SurveysDataTable surveys={surveys} />
      </div>
      <PageFooter />
    </div>
  );
}
