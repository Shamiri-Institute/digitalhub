"use client";

import {
  columns,
  SupervisorsData,
} from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import { SupervisorInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/context/supervisor-info-context";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import DropoutSupervisor from "#/app/(platform)/hc/supervisors/components/dropout-supervisor-form";
import UndropSupervisor from "#/app/(platform)/hc/supervisors/components/undrop-supervisor-form";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { MarkAttendance } from "#/components/common/mark-attendance";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  markManySupervisorAttendance,
  markSupervisorAttendance,
} from "#/lib/actions/supervisor";
import { Prisma } from "@prisma/client";
import { Row } from "@tanstack/react-table";
import parsePhoneNumberFromString from "libphonenumber-js";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";

export default function SupervisorsDataTable({
  supervisors,
  visibleId,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      assignedSchools: true;
      fellows: true;
      supervisorAttendances: {
        include: {
          session: true;
        };
      };
    };
  }>[];
  visibleId: string;
}) {
  const schoolContext = useContext(SchoolInfoContext);
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<Row<SupervisorsData>[]>([]);
  const context = useContext(SupervisorInfoContext);
  const [markAttendanceDialog, setMarkAttendanceDialog] =
    useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<string>();

  useEffect(() => {
    if (!context.attendanceDialog) {
      setBatchMode(false);
    }
  }, [context.attendanceDialog]);

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex gap-1"
          disabled={
            (schoolContext.school?.droppedOut !== null &&
              schoolContext.school?.droppedOut) ||
            selectedRows.length === 0
          }
          onClick={() => {
            setBatchMode(true);
            setMarkAttendanceDialog(true);
          }}
        >
          <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
          <span>Mark supervisor attendance</span>
        </Button>
      </div>
    );
  };

  return (
    <div>
      <DataTable
        data={supervisors}
        columns={columns({
          setMarkAttendanceDialog,
          sessions: schoolContext.school?.interventionSessions ?? [],
        })}
        className={"data-table data-table-action lg:mt-4"}
        emptyStateMessage="No supervisors found for this hub"
        columnVisibilityState={{
          Gender: false,
          "Phone number": false,
          Status: false,
          checkbox: !schoolContext.school?.droppedOut,
          button: !schoolContext.school?.droppedOut,
        }}
        renderTableActions={renderTableActions()}
        enableRowSelection={(row: Row<SupervisorsData>) =>
          row.original.droppedOut === null || !row.original.droppedOut
        }
        rowSelectionDescription={"supervisors"}
        onRowSelectionChange={setSelectedRows as () => {}}
      />
      {context.supervisor && (
        <DropoutSupervisor
          supervisorId={context.supervisor.id}
          setDropoutDialog={context.setDropoutDialog}
          dropoutDialog={context.dropoutDialog}
        >
          <DialogAlertWidget>
            <div className="flex items-center gap-2">
              <span>{context.supervisor?.supervisorName}</span>
              <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
                {""}
              </span>
              <span>
                {context.supervisor?.cellNumber &&
                  parsePhoneNumberFromString(
                    context.supervisor?.cellNumber,
                    "KE",
                  )?.formatNational()}
              </span>
            </div>
          </DialogAlertWidget>
        </DropoutSupervisor>
      )}
      <UndropSupervisor
        supervisorId={
          context.supervisor !== null ? context.supervisor.id : undefined
        }
        setUndropDialog={context.setUndropDialog}
        undropDialog={context.undropDialog}
      >
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            <span>{context.supervisor?.supervisorName}</span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
              {""}
            </span>
            <span>
              {context.supervisor?.cellNumber &&
                parsePhoneNumberFromString(
                  context.supervisor?.cellNumber,
                  "KE",
                )?.formatNational()}
            </span>
          </div>
        </DialogAlertWidget>
      </UndropSupervisor>
      <MarkAttendance
        title={"Mark supervisor attendance"}
        sessions={schoolContext.school?.interventionSessions ?? []}
        selectedSessionId={selectedSession}
        attendances={
          context.supervisor?.supervisorAttendances.map((attendance) => {
            const {
              id,
              supervisorId,
              attended,
              absenceReason,
              sessionId,
              absenceComments,
              session,
            } = attendance;
            return {
              attendanceId: id.toString(),
              id: supervisorId,
              attended,
              absenceReason,
              sessionId,
              schoolId: session.schoolId,
              comments: absenceComments,
            };
          }) ?? []
        }
        id={context.supervisor?.id}
        isOpen={markAttendanceDialog}
        setIsOpen={setMarkAttendanceDialog}
        markAttendanceAction={markSupervisorAttendance}
        bulkMode={batchMode}
        setBulkMode={setBatchMode}
        markBulkAttendanceAction={markManySupervisorAttendance}
        selectedIds={selectedRows.map((x): string => x.original.id)}
      >
        <DialogAlertWidget>
          <div className="flex flex-wrap items-center gap-2">
            {batchMode ? (
              <span>{selectedRows.length} supervisors</span>
            ) : (
              <span>{context.supervisor?.supervisorName}</span>
            )}
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
              {""}
            </span>
            <span>{schoolContext.school?.schoolName}</span>
          </div>
        </DialogAlertWidget>
      </MarkAttendance>
    </div>
  );
}

export function SupervisorsDataTableMenu({
  supervisor,
  state,
}: {
  supervisor: SupervisorsData;
  state: {
    setMarkAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  };
}) {
  const context = useContext(SupervisorInfoContext);
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
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
          onClick={() => {
            context.setSupervisor(supervisor);
            state.setMarkAttendanceDialog(true);
          }}
        >
          Mark attendance
        </DropdownMenuItem>
        {/* TODO: Remove drop out option and refactor context*/}
        {supervisor.droppedOut === null || !supervisor.droppedOut ? (
          <DropdownMenuItem
            onClick={() => {
              context.setSupervisor(supervisor);
              context.setDropoutDialog(true);
            }}
          >
            <div className="text-shamiri-red">Drop out supervisor</div>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
              context.setSupervisor(supervisor);
              context.setUndropDialog(true);
            }}
          >
            <div>Undo drop out</div>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
