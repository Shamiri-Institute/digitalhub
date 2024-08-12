import { BatchUploadDownloadSupervisors } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/upload-csv";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import DataTable from "../../../components/data-table";
import { columns } from "./components/columns";

export default async function SupervisorsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {


  const coordinator = await currentHubCoordinator();

  const supervisors = await db.supervisor.findMany({
    where: {
      hubId: coordinator?.assignedHubId,
    },
    include: {
      assignedSchools: true,
      fellows: true,
    },
  });

  return (
    <>
     <DataTable
      data={supervisors}
      columns={columns}
      className={"data-table data-table-action mt-4"}
      emptyStateMessage="No supervisors found for this hub"
      columnVisibilityState={{
        Gender: false,
      }}
    />
      {coordinator?.assignedHubId &&
        coordinator.implementerId &&
        coordinator.assignedHub?.projectId && (
          <BatchUploadDownloadSupervisors
            hubId={coordinator?.assignedHubId}
            implementerId={coordinator?.implementerId}
            projectId={coordinator?.assignedHub?.projectId}
            schoolVisibleId={visibleId}
          />
        )}
    </>
  );
}
