"use client";

import {
  columns,
  SchoolStudentTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/students/components/columns";
import { BatchUploadDownloadStudents } from "#/app/(platform)/hc/schools/[visibleId]/students/components/upload-csv";
import DataTable from "#/components/data-table";
import { Prisma } from "@prisma/client";

export default function StudentsDatatable({
  data,
  hubCoordinator,
  visibleId,
}: {
  data: SchoolStudentTableData[];
  hubCoordinator: Prisma.HubCoordinatorGetPayload<{
    include: {
      assignedHub: true;
    };
  }> | null;
  visibleId: string;
}) {
  const renderTableActions = () => {
    return (
      hubCoordinator?.assignedHubId &&
      hubCoordinator.implementerId &&
      hubCoordinator.assignedHub?.projectId && (
        <BatchUploadDownloadStudents
          hubId={hubCoordinator?.assignedHubId}
          implementerId={hubCoordinator?.implementerId}
          projectId={hubCoordinator?.assignedHub?.projectId}
          schoolVisibleId={visibleId}
        />
      )
    );
  };
  return (
    <div>
      <DataTable
        data={data}
        columns={columns}
        emptyStateMessage="No students found"
        className="data-table data-table-action mt-4"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{
          Gender: false,
          "Contact no.": false,
          "Admission number": false,
          Stream: false,
          "Class/Form": false,
          "Date added": false,
        }}
      />
    </div>
  );
}
