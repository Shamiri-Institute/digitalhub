import { notFound, redirect } from "next/navigation";

import { CopyDetail } from "#/components/common/survey/copy/copy-detail";
import { ViewerTimeZoneCookie } from "#/components/common/viewer-time-zone";
import PageFooter from "#/components/ui/page-footer";
import { surveyScope } from "#/lib/auth/admin-access";
import { loadCopy } from "#/lib/survey/copy/copy";
import { viewerTimeZone } from "#/lib/viewer-time-zone";

export default async function AdminSurveyCopyPage(props: { params: Promise<{ copyId: string }> }) {
  const scope = await surveyScope();
  if (!scope) {
    redirect("/admin/schedule");
  }
  const viewer = { kind: "project", ...scope } as const;
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
