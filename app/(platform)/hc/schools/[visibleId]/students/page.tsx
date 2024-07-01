import { BatchUploadDownloadStudents } from "#/app/(platform)/hc/schools/[visibleId]/students/components/upload-csv";
import { currentHubCoordinator } from "#/app/auth";
import { db } from "#/lib/db";
import DataTable from "../../../components/data-table";
import { columns } from "./components/columns";

export default async function StudentsPage({
  params: { visibleId },
}: {
  params: { visibleId: string };
}) {
  const hubCoordinator = await currentHubCoordinator();

  const students = await db.student.findMany({
    where: {
      school: {
        visibleId,
      },
    },
    include: {
      clinicalCases: {
        include: {
          sessions: true,
        },
      },
      assignedGroup: true,
    },
  });

  return (
    <>
      <DataTable
        data={students}
        columns={columns}
        emptyStateMessage="No students found"
      />
      {hubCoordinator?.assignedHubId &&
        hubCoordinator.implementerId &&
        hubCoordinator.assignedHub?.projectId && (
          <BatchUploadDownloadStudents
            hubId={hubCoordinator?.assignedHubId}
            implementerId={hubCoordinator?.implementerId}
            projectId={hubCoordinator?.assignedHub?.projectId}
          />
        )}
    </>
  );
}
