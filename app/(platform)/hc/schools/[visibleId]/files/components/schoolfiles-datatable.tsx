"use client";

import { Prisma } from "@prisma/client";
import DataTable from "#/components/data-table";

export default function SchoolFilesDatatable({
  data,
  hubCoordinator,
}: {
  data: any[];
  hubCoordinator: Prisma.HubCoordinatorGetPayload<{
    include: {
      assignedHub: true;
    };
  }> | null;
}) {
  // const students = use(data);
  // const [editDialog, setEditDialog] = useState<boolean>(false);
  // const [attendanceDialog, setAttendanceDialog] = useState<boolean>(false);
  // const [student, setStudent] = useState<SchoolStudentTableData | null>(null);

  const renderTableActions = () => {
    // TODO: Refactor for client component
    // return (
    //   hubCoordinator?.assignedHubId &&
    //   hubCoordinator.implementerId &&
    //   hubCoordinator.assignedHub?.projectId && (
    //     <BatchUploadDownloadStudents
    //       hubId={hubCoordinator?.assignedHubId}
    //       implementerId={hubCoordinator?.implementerId}
    //       projectId={hubCoordinator?.assignedHub?.projectId}
    //       schoolVisibleId={visibleId}
    //     />
    //   )
    // );
    return <div></div>;
  };

  return (
    <div>
      <DataTable
        data={data}
        // columns={columns({ setEditDialog, setStudent, setAttendanceDialog })}
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
        rowSelectionDescription={"students"}
      />

    </div>
  );
}
