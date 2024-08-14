import { BatchUploadDownloadSupervisors } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/upload-csv";
import SupervisorsDataTable from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/supervisors-datatable";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";

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
     <SupervisorsDataTable supervisors={supervisors} />

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
