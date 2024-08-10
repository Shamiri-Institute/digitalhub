"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import {
  columns,
  SupervisorsData,
} from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import { DropoutSupervisor } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/dropout-supervisor-form";
import { MarkAttendance } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/mark-attendance-form";
import { SupervisorInfoContext } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/context/supervisor-info-context";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
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
  const [dropoutDialog, setDropoutDialog] = useState<boolean>(false);
  const [attendanceDialog, setAttendanceDialog] = useState<boolean>(false);
  const [batchMode, setBatchMode] = useState<boolean>(false);
  const [supervisor, setSupervisor] = useState<SupervisorsData | null>(null);
  const [selectedRows, setSelectedRows] = useState<SupervisorsData[]>([]);

  // TODO: Move these actions to main supervisors page
  // const renderTableActions = () => {
  //     return <div className="flex gap-3">
  //         <Button variant="outline" className="flex gap-1">
  //             <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey"/>
  //             <span>Download supervisors CSV template</span>
  //         </Button>
  //         <Button variant="outline" className="flex gap-1">
  //             <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey"/>
  //             <span>Upload supervisors CSV</span>
  //         </Button>
  //         <Button variant="outline" className="flex gap-1">
  //             <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey"/>
  //             <span>Upload fellow monthly feedback CSV</span>
  //         </Button>
  //     </div>
  // }

  useEffect(() => {
    if (!attendanceDialog) {
      setBatchMode(false);
    }
  }, [attendanceDialog]);

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
            setAttendanceDialog(true);
          }}
        >
          <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
          <span>Mark supervisor attendance</span>
        </Button>
      </div>
    );
  };

  return (
    <SupervisorInfoContext.Provider
      value={{
        dropoutDialog,
        setDropoutDialog,
        attendanceDialog,
        setAttendanceDialog,
        supervisor,
        setSupervisor,
      }}
    >
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
      <DropoutSupervisor />
      <MarkAttendance
        schoolVisibleId={visibleId}
        batchMode={batchMode}
        selectedSupervisors={selectedRows}
      />
    </SupervisorInfoContext.Provider>
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
        >
          Edit supervisor information
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
          onClick={() => {
            context.setAttendanceDialog(true);
          }}
        >
          Mark attendance
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
        >
          Monthly supervisor evaluation
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
        >
          Submit complaint
        </DropdownMenuItem>
        <DropdownMenuItem>Overall supervisor evaluation</DropdownMenuItem>
        <DropdownMenuItem
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
          onClick={() => {
            context.setDropoutDialog(true);
          }}
        >
          <div className="text-shamiri-red">Drop out supervisor</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
