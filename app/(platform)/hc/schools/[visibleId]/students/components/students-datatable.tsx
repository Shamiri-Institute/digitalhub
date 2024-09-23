"use client";

import AttendanceHistory from "#/app/(platform)/hc/schools/[visibleId]/students/components/attendance-history";
import {
  columns,
  SchoolStudentTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/students/components/columns";
import StudentDetailsForm from "#/components/common/student/student-details-form";
import DataTable from "#/components/data-table";
import { Prisma } from "@prisma/client";
import { useState } from "react";

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
  const [editDialog, setEditDialog] = useState<boolean>(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] =
    useState<boolean>(false);
  const [student, setStudent] = useState<SchoolStudentTableData | null>(null);

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
        columns={columns({
          setEditDialog,
          setStudent,
          setAttendanceHistoryDialog,
        })}
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
      {student && (
        <div>
          <StudentDetailsForm
            open={editDialog}
            onOpenChange={setEditDialog}
            student={student}
          />
          <AttendanceHistory
            student={student}
            open={attendanceHistoryDialog}
            onOpenChange={setAttendanceHistoryDialog}
          />
        </div>
      )}
    </div>
  );
}
