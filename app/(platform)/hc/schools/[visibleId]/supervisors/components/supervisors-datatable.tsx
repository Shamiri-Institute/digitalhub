"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import {
  columns,
  SupervisorsData,
} from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import { MarkAttendance } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/mark-attendance-form";
import { SupervisorInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/context/supervisor-info-context";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import DropoutSupervisor from "#/app/(platform)/hc/supervisors/components/dropout-supervisor-form";
import UndropSupervisor from "#/app/(platform)/hc/supervisors/components/undrop-supervisor-form";
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
import { Prisma } from "@prisma/client";
import { Row } from "@tanstack/react-table";
import { parsePhoneNumber } from "libphonenumber-js";
import { useContext, useEffect, useState } from "react";

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
  const [selectedRows, setSelectedRows] = useState<SupervisorsData[]>([]);
  const context = useContext(SupervisorInfoContext);

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
            context.setAttendanceDialog(true);
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
        columns={columns}
        className={"data-table data-table-action mt-4"}
        emptyStateMessage="No supervisors found for this hub"
        columnVisibilityState={{
          Gender: false,
          "Phone number": false,
          Status: false,
          checkbox: !schoolContext.school?.droppedOut ?? null,
          button: !schoolContext.school?.droppedOut ?? null,
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
                  parsePhoneNumber(
                    context.supervisor?.cellNumber,
                    "KE",
                  ).formatNational()}
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
                parsePhoneNumber(
                  context.supervisor?.cellNumber,
                  "KE",
                ).formatNational()}
            </span>
          </div>
        </DialogAlertWidget>
      </UndropSupervisor>
      <MarkAttendance
        schoolVisibleId={visibleId}
        batchMode={batchMode}
        selectedSupervisors={selectedRows}
      />
    </div>
  );
}

export function SupervisorsDataTableMenu({
  supervisor,
}: {
  supervisor: SupervisorsData;
}) {
  const context = useContext(SupervisorInfoContext);
  return (
    <DropdownMenu
      onOpenChange={() => {
        context.setSupervisor(supervisor);
      }}
    >
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
            context.setAttendanceDialog && context.setAttendanceDialog(true);
          }}
        >
          Mark attendance
        </DropdownMenuItem>
        {/* TODO: Remove drop out option and refactor context*/}
        {supervisor.droppedOut === null || !supervisor.droppedOut ? (
          <DropdownMenuItem
            onClick={() => {
              context.setDropoutDialog(true);
            }}
          >
            <div className="text-shamiri-red">Drop out supervisor</div>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => {
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
