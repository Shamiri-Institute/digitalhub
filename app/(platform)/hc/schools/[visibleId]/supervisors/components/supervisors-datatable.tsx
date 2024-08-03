"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import {
  columns,
  SupervisorsData,
} from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import { DropoutSupervisor } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/dropout-supervisor-form";
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
import { useContext, useState } from "react";

export default function SupervisorsDataTable({
  supervisors,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      assignedSchools: true;
      fellows: true;
    };
  }>[];
}) {
  const schoolContext = useContext(SchoolInfoContext);
  const [dropoutDialog, setDropoutDialog] = useState<boolean>(false);
  const [supervisor, setSupervisor] = useState<SupervisorsData | null>(null);

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

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex gap-1"
          disabled={
            schoolContext.school?.droppedOut !== null &&
            schoolContext.school?.droppedOut
          }
        >
          <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
          <span>Mark supervisor attendance</span>
        </Button>
      </div>
    );
  };

  return (
    <SupervisorInfoContext.Provider
      value={{ dropoutDialog, setDropoutDialog, supervisor, setSupervisor }}
    >
      <DataTable
        data={supervisors}
        columns={columns}
        className={"data-table data-table-action mt-4"}
        emptyStateMessage="No supervisors found for this hub"
        columnVisibilityState={{
          Gender: false,
          checkbox: !schoolContext.school?.droppedOut ?? null,
          button: !schoolContext.school?.droppedOut ?? null,
        }}
        renderTableActions={renderTableActions()}
        enableRowSelection={(row: Row<SupervisorsData>) =>
          row.original.droppedOut === null || !row.original.droppedOut
        }
      />
      <DropoutSupervisor />
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
        {!supervisor.droppedOut ? (
          <div>
            <DropdownMenuItem>Edit supervisor information</DropdownMenuItem>
            <DropdownMenuItem>Mark attendance</DropdownMenuItem>
            <DropdownMenuItem>Monthly supervisor evaluation</DropdownMenuItem>
            <DropdownMenuItem>Submit complaint</DropdownMenuItem>
          </div>
        ) : null}
        <DropdownMenuItem>Overall supervisor evaluation</DropdownMenuItem>
        {!supervisor.droppedOut ? (
          <DropdownMenuItem
            onClick={() => {
              context.setDropoutDialog(true);
            }}
          >
            <div className="text-shamiri-red">Drop-out supervisor</div>
          </DropdownMenuItem>
        ) : // TODO: Confirm if supervisor will have un drop feature
        null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
