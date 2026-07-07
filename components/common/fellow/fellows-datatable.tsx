"use client";

import { ImplementerRole, Prisma } from "@prisma/client";
import { useMemo, useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import AssignFellowSupervisorDialog from "#/components/common/fellow/assign-fellow-supervisor-dialog";
import AttendanceHistory from "#/components/common/fellow/attendance-history";
import { columns, type SchoolFellowTableData } from "#/components/common/fellow/columns";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";

import FellowAttendanceGetPayload = Prisma.FellowAttendanceGetPayload;

export default function FellowsDatatable({
  fellows,
  supervisors,
  schoolId,
  role,
  attendances,
}: {
  fellows: SchoolFellowTableData[];
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
  schoolId: string;
  role: ImplementerRole;
  hideActions?: boolean;
  attendances: FellowAttendanceGetPayload<{
    include: {
      session: {
        include: {
          session: true;
          school: true;
        };
      };
      group: true;
      PayoutStatements: true;
    };
  }>[];
}) {
  const [selectedFellow, setSelectedFellow] = useState<SchoolFellowTableData | undefined>();
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [replaceDialog, setReplaceDialog] = useState(false);
  const [studentsDialog, setStudentsDialog] = useState(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] = useState(false);
  const [assignSupervisorDialog, setAssignSupervisorDialog] = useState(false);

  const fellow = useMemo(() => {
    if (selectedFellow) {
      const updatedFellow = fellows.find((f) => {
        return f.id === selectedFellow.id;
      });
      return updatedFellow;
    }
    return selectedFellow;
  }, [fellows, selectedFellow]);

  const memoizedColumns = useMemo(() => {
    return columns({
      state: {
        setFellow: setSelectedFellow,
        setDetailsDialog,
        setReplaceDialog,
        setStudentsDialog,
        setAttendanceHistoryDialog,
        setAssignSupervisorDialog,
      },
      role,
    });
  }, [role]);

  return (
    <>
      <DataTable
        columns={memoizedColumns}
        data={fellows}
        className={"data-table data-table-action lg:mt-4"}
        emptyStateMessage="No fellows associated with this school"
        columnVisibilityState={{
          checkbox: role === ImplementerRole.HUB_COORDINATOR,
          Supervisor: false,
        }}
      />
      {fellow && (
        <>
          <FellowDetailsForm
            open={detailsDialog}
            onOpenChange={setDetailsDialog}
            mode={
              role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.ADMIN
                ? "view"
                : role === ImplementerRole.SUPERVISOR
                  ? "edit"
                  : null
            }
            fellow={fellow}
          />
          <AttendanceHistory
            open={attendanceHistoryDialog}
            onOpenChange={setAttendanceHistoryDialog}
            attendances={attendances}
            fellow={fellow}
          >
            <DialogAlertWidget>
              <div className="flex items-center gap-2">
                <span>{fellow.fellowName}</span>
              </div>
            </DialogAlertWidget>
          </AttendanceHistory>
          <AssignFellowSupervisorDialog
            supervisors={supervisors}
            open={assignSupervisorDialog}
            onOpenChange={setAssignSupervisorDialog}
            fellow={fellow}
          >
            <DialogAlertWidget label={fellow.fellowName} />
          </AssignFellowSupervisorDialog>
          {fellow.groupId !== null ? (
            <>
              <ReplaceFellow
                open={replaceDialog}
                onOpenChange={setReplaceDialog}
                fellowId={fellow.id}
                groupId={fellow.groupId}
                supervisors={supervisors}
              >
                <DialogAlertWidget>
                  <div className="flex items-center gap-2">
                    <span>{fellow.fellowName}</span>
                    <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
                    <span>{fellow.groupName}</span>
                  </div>
                </DialogAlertWidget>
              </ReplaceFellow>
              <StudentsInGroup
                students={fellow.students}
                groupId={fellow.groupId}
                groupName={fellow.groupName}
                schoolId={schoolId}
                open={studentsDialog}
                onOpenChange={setStudentsDialog}
                role={role}
              >
                <DialogAlertWidget separator={false}>
                  <div className="flex items-center gap-2">
                    <span>{fellow.fellowName}</span>
                    <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
                    <span>{fellow.groupName}</span>
                  </div>
                </DialogAlertWidget>
              </StudentsInGroup>
            </>
          ) : null}
        </>
      )}
    </>
  );
}
