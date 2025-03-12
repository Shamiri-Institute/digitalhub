"use client";

import { revalidatePageAction } from "#/app/(platform)/fel/schools/actions";
import { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { AddReportingNote } from "#/components/common/student/add-reporting-note";
import AttendanceHistory from "#/components/common/student/attendance-history";
import {
  columns,
  SchoolStudentTableData,
} from "#/components/common/student/columns";
import GroupTransferHistory from "#/components/common/student/group-transfer-history";
import StudentDetailsForm from "#/components/common/student/student-details-form";
import StudentDropoutForm from "#/components/common/student/student-dropout-form";
import DataTable from "#/components/data-table";
import { markStudentAttendance } from "#/lib/actions/student";
import { ImplementerRole } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

export default function StudentsDatatable({
  students,
  role,
  fellowId,
}: {
  students: SchoolStudentTableData[];
  role: ImplementerRole;
  fellowId?: string;
}) {
  const pathname = usePathname();
  const [editDialog, setEditDialog] = useState<boolean>(false);
  const [markAttendanceDialog, setMarkAttendanceDialog] =
    useState<boolean>(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] =
    useState<boolean>(false);
  const [reportingNotesDialog, setReportingNotesDialog] =
    useState<boolean>(false);
  const [groupTransferHistory, setGroupTransferHistory] =
    useState<boolean>(false);
  const [dropoutDialog, setDropoutDialog] = useState<boolean>(false);
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
    return null;
  };

  const markAttendance = async (data: z.infer<typeof MarkAttendanceSchema>) => {
    const [res] = await Promise.all([
      await markStudentAttendance(data),
      await revalidatePageAction(pathname),
    ]);
    return res;
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
          setReportingNotesDialog,
          setGroupTransferHistory,
          setDropoutDialog,
          role,
        })}
        emptyStateMessage="No students found"
        className="data-table data-table-action lg:mt-4"
        renderTableActions={renderTableActions()}
        columnVisibilityState={{
          Gender: false,
          "Contact no.": false,
          "Shamiri ID": false,
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
            schoolId={student.school?.id ?? null}
            assignedGroupId={student.assignedGroupId ?? undefined}
            groupName={student.assignedGroup?.groupName ?? undefined}
            mode="edit"
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span className="capitalize">
                  {student.studentName?.toLowerCase()}
                </span>
                <span className="h-1 w-1 rounded-full bg-shamiri-new-blue"></span>
                <span>{student.admissionNumber}</span>
                <span className="h-1 w-1 rounded-full bg-shamiri-new-blue"></span>
                <span>{student.assignedGroup?.groupName}</span>
              </div>
            </DialogAlertWidget>
          </StudentDetailsForm>
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
            markAttendanceAction={markAttendance}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{student.studentName}</span>
                <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                  {""}
                </span>
                <span>{student.assignedGroup?.groupName}</span>
              </div>
            </DialogAlertWidget>
          </MarkAttendance>
          {student && (
            <AttendanceHistory
              student={students.find((x) => x.id === student.id)!}
              open={attendanceHistoryDialog}
              onOpenChange={setAttendanceHistoryDialog}
              markAttendance={setMarkAttendanceDialog}
              setSelectedSessionId={setSelectedSession}
            />
          )}
          <AddReportingNote
            student={student}
            isOpen={reportingNotesDialog}
            setIsOpen={setReportingNotesDialog}
          />
          <GroupTransferHistory
            student={student}
            open={groupTransferHistory}
            onOpenChange={setGroupTransferHistory}
          />
          <StudentDropoutForm
            student={student}
            isOpen={dropoutDialog}
            setIsOpen={setDropoutDialog}
          />
        </div>
      )}
    </div>
  );
}
