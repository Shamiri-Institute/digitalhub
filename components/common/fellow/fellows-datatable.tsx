"use client";

import type { fellow, supervisor } from "#/db/schema";
import {
  type FellowPersonalDetails,
  loadFellowPersonalDetails,
} from "#/app/(platform)/hc/fellows/actions";
import { ImplementerRole } from "#/db/enums";
import { type SetStateAction, useState } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import AssignFellowSupervisorDialog from "#/components/common/fellow/assign-fellow-supervisor-dialog";
import AttendanceHistory, {
  type FellowAttendanceHistoryRow,
} from "#/components/common/fellow/attendance-history";
import {
  columns,
  type SchoolFellowDialogKind,
  type SchoolFellowTableData,
} from "#/components/common/fellow/columns";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";
import { toastOnError } from "#/components/ui/use-toast";

type OpenSchoolFellowDialog =
  | { kind: "details"; fellowId: string; personalDetails: FellowPersonalDetails }
  | { kind: SchoolFellowDialogKind; fellowId: string };

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
  const [dialog, setDialog] = useState<OpenSchoolFellowDialog | null>(null);
  const fellow = dialog && fellows.find((f) => f.id === dialog.fellowId);
  const fellowPersonalDetails = dialog?.kind === "details" ? dialog.personalDetails : undefined;

  const onDialogOpenChange = (open: SetStateAction<boolean>) => {
    if (!open) setDialog(null);
  };

  const openDetailsDialog = toastOnError(async ({ id: fellowId }: SchoolFellowTableData) => {
    const personalDetails = await loadFellowPersonalDetails(fellowId);
    setDialog({ kind: "details", fellowId, personalDetails });
  });

  return (
    <>
      <DataTable
        urlState
        columns={columns({
          state: {
            openDialog: (kind, { id: fellowId }) => setDialog({ kind, fellowId }),
            openDetailsDialog,
          },
          role,
        })}
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
            open={dialog?.kind === "attendanceHistory"}
            onOpenChange={onDialogOpenChange}
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
            open={dialog?.kind === "assignSupervisor"}
            onOpenChange={onDialogOpenChange}
            fellow={fellow}
          >
            <DialogAlertWidget label={fellow.fellowName} />
          </AssignFellowSupervisorDialog>
          {fellow.groupId !== null ? (
            <>
              <ReplaceFellow
                open={dialog?.kind === "replace"}
                onOpenChange={onDialogOpenChange}
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
                open={dialog?.kind === "students"}
                onOpenChange={onDialogOpenChange}
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
          {fellowPersonalDetails && (
            <FellowDetailsForm
              open={dialog?.kind === "details"}
              onOpenChange={onDialogOpenChange}
              mode={
                role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.ADMIN
                  ? "view"
                  : role === ImplementerRole.SUPERVISOR
                    ? "edit"
                    : null
              }
              fellow={{ ...fellow, ...fellowPersonalDetails }}
            />
          )}
        </>
      )}
    </>
  );
}
