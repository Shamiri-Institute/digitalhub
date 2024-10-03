import SchoolFilesDatatable from "#/app/(platform)/hc/schools/[visibleId]/files/components/files-datatable";
import Loading from "#/app/(platform)/hc/schools/[visibleId]/loading";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import { Suspense } from "react";

export default async function SchoolFilesPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const hubCoordinator = await currentHubCoordinator();

  const schoolFiles = db.schoolDocuments.findMany({
    where: {
      school: {
        visibleId,
      },
    },
  });

  return (
    <Suspense fallback={<Loading />}>
      <SchoolFilesDatatable
        data={schoolFiles}
        hubCoordinator={hubCoordinator}
      />
    </Suspense>
  );
}
