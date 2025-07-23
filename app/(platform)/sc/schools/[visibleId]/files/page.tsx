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

  return <SchoolFilesDatatable data={schoolFiles} schoolId={visibleId} />;
}
