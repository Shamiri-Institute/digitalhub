"use client";

import { handleSupervisorCSVTemplateDownload } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/upload-csv";
import {
  columns,
  SupervisorsData,
} from "#/app/(platform)/hc/supervisors/components/columns";
import DropoutSupervisor from "#/app/(platform)/hc/supervisors/components/dropout-supervisor-form";
import { default as EditSupervisorDetails } from "#/app/(platform)/hc/supervisors/components/edit-supervisor-details-form";
import MonthlySupervisorEvaluation from "#/app/(platform)/hc/supervisors/components/monthly-supervisor-evaluation";
import SubmitComplaint from "#/app/(platform)/hc/supervisors/components/submit-complaint";
import UndropSupervisor from "#/app/(platform)/hc/supervisors/components/undrop-supervisor-form";
import { SupervisorContext } from "#/app/(platform)/hc/supervisors/context/supervisor-context";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import DataTable from "#/components/data-table";
import FileUploader from "#/components/file-uploader";
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
import parsePhoneNumberFromString from "libphonenumber-js";
import { useContext, useState } from "react";
import AddNewSupervisor from "#/app/(platform)/hc/supervisors/components/add-new-supervisor";

export default function MainSupervisorsDataTable({
  supervisors,
  hubId,
  implementerId,
  projectId,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      assignedSchools: true;
      fellows: true;
      hub: {
        include: {
          project: true;
        };
      };
      monthlySupervisorEvaluation: true;
    };
  }>[];
  hubId: string;
  implementerId: string;
  projectId: string;
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
              parsePhoneNumberFromString(
                context.supervisor?.cellNumber,
                "KE",
              )?.formatNational()}
          </span>
        </div>
      </DialogAlertWidget>
    );
  };

  const renderTableActions = () => {
    return (
      <div className="flex gap-3">
        <AddNewSupervisor />
      </div>
    );
  };

  return (
    <div>
      <DataTable
        data={supervisors}
        columns={columns}
        className={"data-table data-table-action bg-white lg:mt-4"}
        emptyStateMessage="No supervisors found for this hub"
        columnVisibilityState={{
          // checkbox: !schoolContext.school?.droppedOut ?? null,
          // button: !schoolContext.school?.droppedOut ?? null,
          Gender: false,
          Status: false,
          county: false,
          subCounty: false,
        }}
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
      <MonthlySupervisorEvaluation
        supervisorId={
          context.supervisor !== null ? context.supervisor.id : undefined
        }
        setIsOpen={context.setEvaluationDialog}
        isOpen={context.evaluationDialog}
        project={context.supervisor?.hub?.project ?? null}
        evaluations={context.supervisor?.monthlySupervisorEvaluation ?? []}
      >
        {renderDialogAlert()}
      </MonthlySupervisorEvaluation>
      <EditSupervisorDetails />
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
          onClick={() => {
            context.setEvaluationDialog(true);
          }}
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
