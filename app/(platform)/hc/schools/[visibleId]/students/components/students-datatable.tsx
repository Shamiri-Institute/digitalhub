"use client";

import AttendanceHistory from "#/app/(platform)/hc/schools/[visibleId]/students/components/attendance-history";
import {
  columns,
  SchoolStudentTableData,
} from "#/app/(platform)/hc/schools/[visibleId]/students/components/columns";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import StudentDetailsForm from "#/components/common/student/student-details-form";
import DataTable from "#/components/data-table";
import { markStudentAttendance } from "#/lib/actions/student";
import { Prisma } from "@prisma/client";
import { use, useState } from "react";

export default function StudentsDatatable({
  data,
  hubCoordinator,
}: {
  data: Promise<SchoolStudentTableData[]>;
  hubCoordinator: Prisma.HubCoordinatorGetPayload<{
    include: {
      assignedHub: true;
    };
  }> | null;
}) {
  const students = use(data);
  const [editDialog, setEditDialog] = useState<boolean>(false);
  const [markAttendanceDialog, setMarkAttendanceDialog] =
    useState<boolean>(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] =
    useState<boolean>(false);
  const [student, setStudent] = useState<SchoolStudentTableData | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>();

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
        data={students}
        columns={columns({
          setEditDialog,
          setStudent,
          setAttendanceHistoryDialog,
          setMarkAttendanceDialog,
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
          <MarkAttendance
            title={"Mark student attendance"}
            sessions={student.school ? student.school.interventionSessions : []}
            selectedSessionId={selectedSession}
            attendances={student.studentAttendances.map((attendance) => {
              const {
                id,
                studentId,
                attended,
                absenceReason,
                sessionId,
                comments,
              } = attendance;
              return {
                attendanceId: id.toString(),
                id: studentId,
                attended,
                absenceReason,
                sessionId,
                schoolId: student.schoolId,
                comments,
              };
            })}
            id={student.id}
            isOpen={markAttendanceDialog}
            setIsOpen={setMarkAttendanceDialog}
            markAttendanceAction={markStudentAttendance}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{student.studentName}</span>
                <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                  {""}
                </span>
                <span>{student.assignedGroupId}</span>
              </div>
            </DialogAlertWidget>
          </MarkAttendance>
          <AttendanceHistory
            student={student}
            open={attendanceHistoryDialog}
            onOpenChange={setAttendanceHistoryDialog}
            markAttendance={setMarkAttendanceDialog}
            setSelectedSessionId={setSelectedSession}
          />
        </div>
      )}
    </div>
  );
}
