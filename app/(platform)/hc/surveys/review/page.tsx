import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import {
  type ReviewSearchParams,
  SurveyReview,
} from "#/components/common/survey/review/survey-review";
import { HUB_SURVEY_TABS } from "#/components/common/survey/survey-tabs";
import TabToggleNavigation from "#/components/common/tabs/tab-navigation";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { hubCoordinatorViewer } from "#/lib/auth/survey-access";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export default async function HubSurveyReviewPage(props: {
  searchParams: Promise<ReviewSearchParams>;
}) {
  const viewer = await hubCoordinatorViewer();
  if (!viewer) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const [searchParams, timeZone] = await Promise.all([props.searchParams, viewerTimeZone()]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Surveys" />
        <TabToggleNavigation options={HUB_SURVEY_TABS} className="px-0" />
        <Separator />
        <SurveyReview viewer={viewer} searchParams={searchParams} timeZone={timeZone} />
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
