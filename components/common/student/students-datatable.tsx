"use client";

import type { TransferSchool } from "#/components/common/schools/school-students-page";
import { ImplementerRole } from "#/db/enums";
import { type SetStateAction, useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import { AddReportingNote } from "#/components/common/student/add-reporting-note";
import AttendanceHistory from "#/components/common/student/attendance-history";
import {
  columns,
  type SchoolStudentTableData,
  type StudentDialogKind,
} from "#/components/common/student/columns";
import GroupTransferHistory from "#/components/common/student/group-transfer-history";
import StudentArchiveForm from "#/components/common/student/student-archive-form";
import StudentDetailsForm from "#/components/common/student/student-details-form";
import StudentDropoutForm from "#/components/common/student/student-dropout-form";
import StudentMoveSchoolForm from "#/components/common/student/student-move-school-form";
import DataTable from "#/components/data-table";
import { markStudentAttendance } from "#/lib/actions/student";

// Marking attendance from the attendance history keeps the history open underneath.
type OpenStudentDialog = {
  kind: StudentDialogKind | "markAttendanceFromHistory";
  studentId: string;
};

export default function StudentsDatatable({
  students,
  role,
  transferSchools = [],
}: {
  students: SchoolStudentTableData[];
  role: ImplementerRole;
  transferSchools?: TransferSchool[];
}) {
  const [dialog, setDialog] = useState<OpenStudentDialog | null>(null);
  const [historySessionId, setHistorySessionId] = useState<string>();
  const student = dialog && students.find((s) => s.id === dialog.studentId);

  const onDialogOpenChange = (open: SetStateAction<boolean>) => {
    if (!open) setDialog(null);
  };

  const onMarkAttendanceOpenChange = (open: SetStateAction<boolean>) => {
    if (open) return;
    setDialog((current) =>
      current?.kind === "markAttendanceFromHistory"
        ? { kind: "attendanceHistory", studentId: current.studentId }
        : null,
    );
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
          openDialog: (kind, { id: studentId }) => setDialog({ kind, studentId }),
          role,
          sessions: students[0]?.school?.interventionSessions ?? [],
        })}
        emptyStateMessage="No students found"
        className="data-table data-table-action lg:mt-4"
        columnVisibilityState={{
          Gender: false,
          "Contact no.": false,
          "Shamiri ID": false,
          "Admission number": false,
          "Clinical Sessions": false,
          Stream: false,
          "Grade/Form": false,
          "Date added": false,
          Age: false,
          checkbox: false,
        }}
        rowSelectionDescription={"students"}
      />
      {student && (
        <div>
          <StudentDetailsForm
            open={dialog?.kind === "edit"}
            onOpenChange={onDialogOpenChange}
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
            selectedSessionId={
              dialog?.kind === "markAttendanceFromHistory" ? historySessionId : undefined
            }
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
            isOpen={
              dialog?.kind === "markAttendance" || dialog?.kind === "markAttendanceFromHistory"
            }
            setIsOpen={onMarkAttendanceOpenChange}
            markAttendanceAction={markStudentAttendance}
          >
            {renderDialogAlert()}
          </MarkAttendance>
          <AttendanceHistory
            student={student}
            open={
              dialog?.kind === "attendanceHistory" || dialog?.kind === "markAttendanceFromHistory"
            }
            onOpenChange={onDialogOpenChange}
            markAttendance={() =>
              setDialog({ kind: "markAttendanceFromHistory", studentId: student.id })
            }
            setSelectedSessionId={setHistorySessionId}
          >
            {renderDialogAlert()}
          </AttendanceHistory>
          <AddReportingNote
            student={student}
            isOpen={dialog?.kind === "reportingNotes"}
            setIsOpen={onDialogOpenChange}
          >
            {renderDialogAlert()}
          </AddReportingNote>
          <GroupTransferHistory
            student={student}
            open={dialog?.kind === "groupTransferHistory"}
            onOpenChange={onDialogOpenChange}
          >
            {renderDialogAlert()}
          </GroupTransferHistory>
          <StudentDropoutForm
            student={student}
            isOpen={dialog?.kind === "dropout"}
            setIsOpen={onDialogOpenChange}
          >
            {renderDialogAlert()}
          </StudentDropoutForm>
          <StudentArchiveForm
            student={student}
            isOpen={dialog?.kind === "archive"}
            setIsOpen={onDialogOpenChange}
          >
            {renderDialogAlert()}
          </StudentArchiveForm>
          <StudentMoveSchoolForm
            student={student}
            schools={transferSchools.filter((school) => school.id !== student.schoolId)}
            isOpen={dialog?.kind === "moveSchool"}
            setIsOpen={onDialogOpenChange}
          >
            {renderDialogAlert()}
          </StudentMoveSchoolForm>
        </div>
      )}
    </div>
  );
}
