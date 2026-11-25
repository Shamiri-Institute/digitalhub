import { redirect } from "next/navigation";

import {
  type ReviewSearchParams,
  SurveyReview,
} from "#/components/common/survey/review/survey-review";
import { ADMIN_SURVEY_TABS } from "#/components/common/survey/survey-tabs";
import TabToggleNavigation from "#/components/common/tabs/tab-navigation";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { surveyScope } from "#/lib/auth/admin-access";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export default async function AdminSurveyReviewPage(props: {
  searchParams: Promise<ReviewSearchParams>;
}) {
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }
  const [searchParams, timeZone] = await Promise.all([props.searchParams, viewerTimeZone()]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Surveys" />
        <TabToggleNavigation options={ADMIN_SURVEY_TABS} className="px-0" />
        <Separator />
        <SurveyReview
          viewer={{ kind: "project", ...scope }}
          searchParams={searchParams}
          timeZone={timeZone}
        />
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
