"use client";

import type { fellow, supervisor } from "#/db/schema";
import {
  type FellowPersonalDetails,
  loadFellowPersonalDetails,
} from "#/app/(platform)/hc/fellows/actions";
import { ImplementerRole } from "#/db/enums";
import { useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import AssignFellowSupervisorDialog from "#/components/common/fellow/assign-fellow-supervisor-dialog";
import AttendanceHistory, {
  type FellowAttendanceHistoryRow,
} from "#/components/common/fellow/attendance-history";
import { columns, type SchoolFellowTableData } from "#/components/common/fellow/columns";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";
import { toastOnError } from "#/components/ui/use-toast";

export default function FellowsDatatable({
  fellows,
  supervisors,
  schoolId,
  role,
  attendances,
}: {
  fellows: SchoolFellowTableData[];
  supervisors: (Pick<typeof supervisor.$inferSelect, "id" | "supervisorName"> & {
    fellows: Pick<typeof fellow.$inferSelect, "id" | "fellowName" | "droppedOut">[];
  })[];
  schoolId: string;
  role: ImplementerRole;
  hideActions?: boolean;
  attendances: FellowAttendanceHistoryRow[];
}) {
  const [selectedFellow, setSelectedFellow] = useState<SchoolFellowTableData | undefined>();
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [replaceDialog, setReplaceDialog] = useState(false);
  const [studentsDialog, setStudentsDialog] = useState(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] = useState(false);
  const [assignSupervisorDialog, setAssignSupervisorDialog] = useState(false);
  const [fellowToShow, setFellowToShow] = useState<
    (SchoolFellowTableData & FellowPersonalDetails) | null
  >(null);

  const openDetailsDialog = toastOnError(async (fellowRow: SchoolFellowTableData) => {
    const personalDetails = await loadFellowPersonalDetails(fellowRow.id);
    setFellowToShow({ ...fellowRow, ...personalDetails });
    setDetailsDialog(true);
  });

  const fellow = (() => {
    if (selectedFellow) {
      const updatedFellow = fellows.find((f) => {
        return f.id === selectedFellow.id;
      });
      return updatedFellow;
    }
    return selectedFellow;
  })();

  const memoizedColumns = columns({
    state: {
      setFellow: setSelectedFellow,
      openDetailsDialog,
      setReplaceDialog,
      setStudentsDialog,
      setAttendanceHistoryDialog,
      setAssignSupervisorDialog,
    },
    role,
  });

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
      {fellowToShow && (
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
          fellow={fellowToShow}
        />
      )}
    </>
  );
}
