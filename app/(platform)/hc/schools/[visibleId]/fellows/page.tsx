import { BatchUploadDownloadFellow } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/upload-csv";
import { db } from "#/lib/db";
import DataTable from "../../components/data-table";
import { columns } from "./components/columns";

export default async function FellowsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const fellows = await db.fellow.findMany({
    where: {
      groups: {
        some: {
          school: {
            visibleId,
          },
        },
      },
    },
    include: {
      groups: true,
      supervisor: {
        include: {
          fellows: true,
        },
      },
      weeklyFellowRatings: true,
    },
  });

  return (
    <>
      <DataTable
        columns={columns}
        data={fellows}
        emptyStateMessage="No fellows associated with this school"
      />
      <BatchUploadDownloadFellow />
    </>
  );
}
