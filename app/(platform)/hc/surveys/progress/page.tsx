import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { SurveyProgressTable } from "#/components/common/survey/survey-progress-table";
import { HUB_SURVEY_TABS } from "#/components/common/survey/survey-tabs";
import TabToggleNavigation from "#/components/common/tabs/tab-navigation";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { hubCoordinatorViewer } from "#/lib/auth/survey-access";
import { fetchSurveyProgress, progressBySurvey } from "#/lib/survey/survey-progress";

export default async function HubSurveyProgressPage() {
  const viewer = await hubCoordinatorViewer();
  if (!viewer) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const surveys = progressBySurvey(await fetchSurveyProgress(viewer));

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Surveys" />
        <TabToggleNavigation options={HUB_SURVEY_TABS} className="px-0" />
        <Separator />
        {surveys.length === 0 ? (
          <p className="text-sm text-shamiri-text-grey">
            Your hub hasn&rsquo;t printed any survey copies yet.
          </p>
        ) : (
          surveys.map((survey) => (
            <section key={survey.surveyId} className="space-y-3">
              <h2 className="text-xl font-semibold">
                {survey.surveyTitle}{" "}
                <span className="text-sm font-normal text-shamiri-text-grey">
                  {survey.surveyCode}
                </span>
              </h2>
              <SurveyProgressTable rows={survey.schools} showHub={false} />
            </section>
          ))
        )}
      </div>
      <PageFooter />
    </div>
  );
}
