import Loading from "#/app/(platform)/hc/schools/[visibleId]/loading";
import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { db } from "#/lib/db";
import { Suspense } from "react";

export default async function SchoolFilesPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const schoolFiles = db.schoolDocuments.findMany({
    where: {
      school: {
        visibleId,
      },
    },
  });

  return (
    <Suspense fallback={<Loading />}>
      <SchoolFilesDatatable data={schoolFiles} schoolId={visibleId} />
    </Suspense>
  );
}
