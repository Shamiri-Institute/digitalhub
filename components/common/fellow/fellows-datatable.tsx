"use client";

import { FellowInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/fellows/context/fellow-info-context";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import AssignFellowSupervisorDialog from "#/components/common/fellow/assign-fellow-supervisor-dialog";
import AttendanceHistory from "#/components/common/fellow/attendance-history";
import {
  columns,
  SchoolFellowTableData,
} from "#/components/common/fellow/columns";
import FellowDetailsForm from "#/components/common/fellow/fellow-details-form";
import ReplaceFellow from "#/components/common/fellow/replace-fellow";
import { BatchUploadDownloadFellow } from "#/components/common/fellow/upload-csv";
import StudentsInGroup from "#/components/common/student/students-in-group";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { ImplementerRole, Prisma } from "@prisma/client";
import { Dispatch, SetStateAction, useContext, useState } from "react";
import FellowAttendanceGetPayload = Prisma.FellowAttendanceGetPayload;

export default function FellowsDatatable({
  fellows,
  supervisors,
  schoolVisibleId,
  role,
  hideActions = false,
  attendances,
}: {
  fellows: SchoolFellowTableData[];
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      fellows: true;
    };
  }>[];
  schoolVisibleId: string;
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
  const [fellow, setFellow] = useState<SchoolFellowTableData | undefined>();
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [replaceDialog, setReplaceDialog] = useState(false);
  const [studentsDialog, setStudentsDialog] = useState(false);
  const [attendanceHistoryDialog, setAttendanceHistoryDialog] = useState(false);
  const [assignSupervisorDialog, setAssignSupervisorDialog] = useState(false);
  const renderTableActions = () => {
    return <BatchUploadDownloadFellow role={role} />;
  };

  return (
    <>
      <DataTable
        columns={columns({
          state: {
            setFellow,
            setDetailsDialog,
            setReplaceDialog,
            setStudentsDialog,
            setAttendanceHistoryDialog,
            setAssignSupervisorDialog,
          },
          role,
        })}
        data={fellows}
        className={"data-table data-table-action mt-4"}
        emptyStateMessage="No fellows associated with this school"
        renderTableActions={!hideActions && renderTableActions()}
      />
      {fellow && (
        <>
          <FellowDetailsForm
            open={detailsDialog}
            onOpenChange={setDetailsDialog}
            mode={
              role === "HUB_COORDINATOR"
                ? "view"
                : role === "SUPERVISOR"
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
                schoolVisibleId={schoolVisibleId}
              >
                <DialogAlertWidget>
                  <div className="flex items-center gap-2">
                    <span>{fellow.fellowName}</span>
                    <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                      {""}
                    </span>
                    <span>{fellow.groupName}</span>
                  </div>
                </DialogAlertWidget>
              </ReplaceFellow>
              <StudentsInGroup
                students={fellow.students}
                groupId={fellow.groupId}
                groupName={fellow.groupName}
                schoolVisibleId={schoolVisibleId}
                open={studentsDialog}
                onOpenChange={setStudentsDialog}
              >
                <DialogAlertWidget>
                  <div className="flex items-center gap-2">
                    <span>Group {fellow.groupName}</span>
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

export function FellowsDatatableMenu({
  fellow,
  state,
  role,
}: {
  fellow: SchoolFellowTableData;
  state: {
    setFellow: Dispatch<SetStateAction<SchoolFellowTableData | undefined>>;
    setDetailsDialog: Dispatch<SetStateAction<boolean>>;
    setReplaceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
    setAttendanceHistoryDialog: Dispatch<SetStateAction<boolean>>;
    setAssignSupervisorDialog: Dispatch<SetStateAction<boolean>>;
  };
  role: ImplementerRole;
}) {
  const context = useContext(FellowInfoContext);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="absolute inset-0 border-l bg-white">
          <div className="flex h-full w-full items-center justify-center">
            <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">
            Actions
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            state.setFellow(fellow);
            state.setDetailsDialog(true);
          }}
        >
          {role === "HUB_COORDINATOR"
            ? "View fellow information"
            : role === "SUPERVISOR"
              ? "Edit fellow information"
              : null}
        </DropdownMenuItem>
        {role === "HUB_COORDINATOR" && (
          <DropdownMenuItem
            disabled={fellow.droppedOut ?? undefined}
            onClick={() => {
              state.setFellow(fellow);
              state.setAssignSupervisorDialog(true);
            }}
          >
            Assign supervisor
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={fellow.groupId === null}
          onClick={() => {
            state.setFellow(fellow);
            state.setStudentsDialog(true);
          }}
        >
          View students in group
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={fellow.groupId === null}
          onClick={() => {
            state.setFellow(fellow);
            state.setReplaceDialog(true);
          }}
        >
          Replace fellow
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            state.setFellow(fellow);
            state.setAttendanceHistoryDialog(true);
          }}
        >
          Session attendance history
        </DropdownMenuItem>
        <DropdownMenuItem>View complaints</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
