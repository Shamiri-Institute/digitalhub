import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { ScanUploader } from "#/components/common/survey/scan-uploader";
import { ScanUploadsTable } from "#/components/common/survey/scan-uploads-table";
import { HUB_SURVEY_TABS } from "#/components/common/survey/survey-tabs";
import TabToggleNavigation from "#/components/common/tabs/tab-navigation";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { hubCoordinatorViewer } from "#/lib/auth/survey-access";
import { fetchScanUploads } from "#/lib/survey/scan-upload-queries";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export default async function HubSurveyScansPage() {
  const viewer = await hubCoordinatorViewer();
  if (!viewer) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }

  const [uploads, timeZone] = await Promise.all([fetchScanUploads(viewer), viewerTimeZone()]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Surveys" />
        <TabToggleNavigation options={HUB_SURVEY_TABS} className="px-0" />
        <Separator />
        <ScanUploader />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Uploaded scans</h2>
          <ScanUploadsTable uploads={uploads} showHub={false} timeZone={timeZone} />
        </section>
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
