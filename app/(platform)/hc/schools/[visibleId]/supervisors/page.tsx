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
  const hubCoordinator = await currentHubCoordinator();

  const supervisors = await db.supervisor.findMany({
    where: {
      fellows: {
        some: {
          groups: {
            some: {
              schoolId: visibleId,
            },
          },
        },
      },
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
        emptyStateMessage="No supervisors found for this school"
      />
      {hubCoordinator?.assignedHubId &&
        hubCoordinator.implementerId &&
        hubCoordinator.assignedHub?.projectId &&
        <BatchUploadDownloadSupervisors

          hubId={hubCoordinator?.assignedHubId}
          implementerId={hubCoordinator?.implementerId}
          projectId={hubCoordinator?.assignedHub?.projectId}
          schoolVisibleId={visibleId}
        />
      }
    </>
  );
}
