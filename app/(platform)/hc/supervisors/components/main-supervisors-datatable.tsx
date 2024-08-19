"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import {
  columns,
  SupervisorsData,
} from "#/app/(platform)/hc/supervisors/components/columns";
import DropoutSupervisor from "#/app/(platform)/hc/supervisors/components/dropout-supervisor-form";
import {
  default as EditSupervisorDetails,
  default as EditSupervisorDetailsForm,
} from "#/app/(platform)/hc/supervisors/components/edit-supervisor-details-form";
import SubmitComplaint from "#/app/(platform)/hc/supervisors/components/submit-complaint";
import UndropSupervisor from "#/app/(platform)/hc/supervisors/components/undrop-supervisor-form";
import { SupervisorContext } from "#/app/(platform)/hc/supervisors/context/supervisor-context";
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
import { useContext, useState } from "react";

export default function MainSupervisorsDataTable({
  supervisors,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      assignedSchools: true;
      fellows: true;
    };
  }>[];
}) {
  const [selectedRows, setSelectedRows] = useState<SupervisorsData[]>([]);
  const context = useContext(SupervisorContext);

  const renderDialogAlert = () => {
    return (
      <DialogAlertWidget>
        <div className="flex items-center gap-2">
          <span>{context.supervisor?.supervisorName}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
          <span>
            {context.supervisor?.cellNumber &&
              parsePhoneNumber(
                context.supervisor?.cellNumber,
                "KE",
              ).formatNational()}
          </span>
        </div>
      </DialogAlertWidget>
    );
  };

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        <Button variant="outline" className="flex gap-1 bg-white">
          <Icons.fileDown className="h-4 w-4 text-shamiri-text-grey" />
          <span>Download supervisors CSV template</span>
        </Button>
        <Button variant="outline" className="flex gap-1 bg-white">
          <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
          <span>Upload supervisors CSV</span>
        </Button>
        <Button variant="outline" className="flex gap-1 bg-white">
          <Icons.fileUp className="h-4 w-4 text-shamiri-text-grey" />
          <span>Upload fellow monthly feedback CSV</span>
        </Button>
      </div>
    );
  };

  return (
    <div>
      <DataTable
        data={supervisors}
        columns={columns}
        className={"data-table data-table-action mt-4 bg-white"}
        emptyStateMessage="No supervisors found for this hub"
        columnVisibilityState={
          {
            // checkbox: !schoolContext.school?.droppedOut ?? null,
            // button: !schoolContext.school?.droppedOut ?? null,
          }
        }
        renderTableActions={renderTableActions()}
        enableRowSelection={(row: Row<SupervisorsData>) =>
          row.original.droppedOut === null || !row.original.droppedOut
        }
        rowSelectionDescription={"supervisors"}
        onRowSelectionChange={setSelectedRows as () => {}}
      />
      <EditSupervisorDetails />
      <DropoutSupervisor
        supervisorId={
          context.supervisor !== null ? context.supervisor.id : undefined
        }
        setDropoutDialog={context.setDropoutDialog}
        dropoutDialog={context.dropoutDialog}
      >
        {renderDialogAlert()}
      </DropoutSupervisor>
      <UndropSupervisor
        supervisorId={
          context.supervisor !== null ? context.supervisor.id : undefined
        }
        setUndropDialog={context.setUndropDialog}
        undropDialog={context.undropDialog}
      >
        {renderDialogAlert()}
      </UndropSupervisor>
      <SubmitComplaint
        supervisorId={
          context.supervisor !== null ? context.supervisor.id : undefined
        }
        setIsOpen={context.setComplaintDialog}
        isOpen={context.complaintDialog}
      >
        {renderDialogAlert()}
      </SubmitComplaint>
      <EditSupervisorDetailsForm />
    </div>
  );
}

export function AllSupervisorsDataTableMenu({
  supervisor,
}: {
  supervisor: SupervisorsData;
}) {
  const context = useContext(SupervisorContext);
  return (
    <DropdownMenu
      onOpenChange={(value) => {
        if (value) {
          context.setSupervisor(supervisor);
        }
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
            context.setEditDialog(true);
          }}
        >
          Edit supervisor information
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
        >
          Monthly supervisor evaluation
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
          onClick={() => {
            context.setComplaintDialog(true);
          }}
        >
          Submit complaint
        </DropdownMenuItem>
        <DropdownMenuItem>Overall supervisor evaluation</DropdownMenuItem>
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
