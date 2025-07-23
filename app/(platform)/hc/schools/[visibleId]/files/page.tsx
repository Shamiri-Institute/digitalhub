import { Suspense } from "react";
import Loading from "#/app/(platform)/hc/schools/[visibleId]/loading";
import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { db } from "#/lib/db";

export default async function SchoolFilesPage(props: { params: Promise<{ visibleId: string }> }) {
  const params = await props.params;

  const { visibleId } = params;

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
