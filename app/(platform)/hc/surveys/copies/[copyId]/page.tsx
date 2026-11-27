import { notFound } from "next/navigation";

import { InvalidPersonnelRole } from "#/components/common/invalid-personnel-role";
import { CopyDetail } from "#/components/common/survey/copy/copy-detail";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import { hubCoordinatorViewer } from "#/lib/auth/survey-access";
import { loadCopy } from "#/lib/survey/copy/copy";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export default async function HubSurveyCopyPage(props: { params: Promise<{ copyId: string }> }) {
  const viewer = await hubCoordinatorViewer();
  if (!viewer) {
    return <InvalidPersonnelRole userRole="hub-coordinator" />;
  }
  const { copyId } = await props.params;
  const [copy, timeZone] = await Promise.all([loadCopy(viewer, copyId), viewerTimeZone()]);
  if (!copy) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="container w-full grow py-10">
        <CopyDetail copy={copy} viewerKind={viewer.kind} timeZone={timeZone} />
        <ViewerTimeZoneCookie serverTimeZone={timeZone} />
      </div>
      <PageFooter />
    </div>
  );
}
