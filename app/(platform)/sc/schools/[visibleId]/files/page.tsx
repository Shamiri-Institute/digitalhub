import SchoolFilesDatatable from "#/components/common/files/files-datatable";
import { db } from "#/lib/db";

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

  return <SchoolFilesDatatable data={schoolFiles} schoolId={visibleId} />;
}
