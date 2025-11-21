"use client";

import { ImplementerRole } from "@prisma/client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { z } from "zod";
import { revalidatePageAction } from "#/app/(platform)/fel/schools/actions";
import type { MarkAttendanceSchema } from "#/app/(platform)/hc/schemas";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { AddReportingNote } from "#/components/common/student/add-reporting-note";
import AttendanceHistory from "#/components/common/student/attendance-history";
import { columns, type SchoolStudentTableData } from "#/components/common/student/columns";
import GroupTransferHistory from "#/components/common/student/group-transfer-history";
import StudentDetailsForm from "#/components/common/student/student-details-form";
import StudentDropoutForm from "#/components/common/student/student-dropout-form";
import DataTable from "#/components/data-table";
import { markStudentAttendance } from "#/lib/actions/student";

export default function StudentsDatatable({
  students,
  role,
}: {
  students: SchoolStudentTableData[];
  role: ImplementerRole;
}) {
  const pathname = usePathname();
  const [editDialog, setEditDialog] = useState<boolean>(false);
  const [markAttendanceDialog, setMarkAttendanceDialog] = useState<boolean>(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] = useState<boolean>(false);
  const [reportingNotesDialog, setReportingNotesDialog] = useState<boolean>(false);
  const [groupTransferHistory, setGroupTransferHistory] = useState<boolean>(false);
  const [dropoutDialog, setDropoutDialog] = useState<boolean>(false);
  const [student, setStudent] = useState<SchoolStudentTableData | null>(null);
  const [selectedSession, setSelectedSession] = useState<string>();

  const markAttendance = async (data: z.infer<typeof MarkAttendanceSchema>) => {
    const [res] = await Promise.all([
      await markStudentAttendance(data),
      await revalidatePageAction(pathname),
    ]);
    return res;
  };

  const renderDialogAlert = () => {
    return (
      <DialogAlertWidget separator={false}>
        <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
          <span className="capitalize">{student?.studentName?.toLowerCase()}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue" />
          <span>{student?.assignedGroup?.groupName}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue" />
          <span>{student?.admissionNumber}</span>
        </div>
      </DialogAlertWidget>
    );
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
        columnVisibilityState={{
          Gender: false,
          "Contact no.": false,
          "Shamiri ID": false,
          "Admission number": false,
          Stream: false,
          "Class/Form": false,
          "Date added": false,
          checkbox: false,
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
            mode={role === ImplementerRole.ADMIN ? "view" : "edit"}
            role={role}
          >
            {renderDialogAlert()}
          </StudentDetailsForm>
          <MarkAttendance
            title={"Mark student attendance"}
            sessions={student.school ? student.school.interventionSessions : []}
            selectedSessionId={selectedSession}
            attendances={student.studentAttendances.map((attendance) => {
              const { id, studentId, attended, absenceReason, sessionId, comments } = attendance;
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
            {renderDialogAlert()}
          </MarkAttendance>
          {student && (
            <AttendanceHistory
              student={students.find((x) => x.id === student.id)!}
              open={attendanceHistoryDialog}
              onOpenChange={setAttendanceHistoryDialog}
              markAttendance={setMarkAttendanceDialog}
              setSelectedSessionId={setSelectedSession}
            >
              {renderDialogAlert()}
            </AttendanceHistory>
          )}
          <AddReportingNote
            student={student}
            isOpen={reportingNotesDialog}
            setIsOpen={setReportingNotesDialog}
          >
            {renderDialogAlert()}
          </AddReportingNote>
          <GroupTransferHistory
            student={student}
            open={groupTransferHistory}
            onOpenChange={setGroupTransferHistory}
          >
            {renderDialogAlert()}
          </GroupTransferHistory>
          <StudentDropoutForm student={student} isOpen={dropoutDialog} setIsOpen={setDropoutDialog}>
            {renderDialogAlert()}
          </StudentDropoutForm>
        </div>
      )}
    </div>
  );
}
