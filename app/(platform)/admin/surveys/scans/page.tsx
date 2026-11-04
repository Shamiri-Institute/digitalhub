import { redirect } from "next/navigation";

import { ScanUploader } from "#/components/common/survey/scan-uploader";
import { ScanUploadsTable } from "#/components/common/survey/scan-uploads-table";
import { ADMIN_SURVEY_TABS } from "#/components/common/survey/survey-tabs";
import TabToggleNavigation from "#/components/common/tabs/tab-navigation";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { surveyScope } from "#/lib/auth/admin-access";
import { fetchScanUploads, fetchUploadHubs } from "#/lib/survey/scan-upload-queries";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export default async function AdminSurveyScansPage() {
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }

  const viewer = { kind: "project", ...scope } as const;
  const [uploads, uploadHubs, timeZone] = await Promise.all([
    fetchScanUploads(viewer),
    fetchUploadHubs(viewer),
    viewerTimeZone(),
  ]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Surveys" />
        <TabToggleNavigation options={ADMIN_SURVEY_TABS} className="px-0" />
        <Separator />
        <ScanUploader hubs={uploadHubs} />
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Uploaded scans</h2>
          <ScanUploadsTable uploads={uploads} showHub timeZone={timeZone} />
        </section>
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
