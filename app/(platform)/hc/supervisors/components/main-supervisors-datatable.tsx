"use client";

import { ImplementerRole, type Prisma } from "@prisma/client";
import parsePhoneNumberFromString from "libphonenumber-js";
import { useState } from "react";
import AddNewSupervisor from "#/app/(platform)/hc/supervisors/components/add-new-supervisor";
import { columns, type SupervisorsData } from "#/app/(platform)/hc/supervisors/components/columns";
import DropoutSupervisor from "#/app/(platform)/hc/supervisors/components/dropout-supervisor-form";
import MonthlySupervisorEvaluation from "#/app/(platform)/hc/supervisors/components/monthly-supervisor-evaluation";
import SubmitComplaint from "#/app/(platform)/hc/supervisors/components/submit-complaint";
import SupervisorDetailsForm from "#/app/(platform)/hc/supervisors/components/supervisor-details-form";
import UndropSupervisor from "#/app/(platform)/hc/supervisors/components/undrop-supervisor-form";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
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

export default function MainSupervisorsDataTable({
  supervisors,
  role,
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
  role: ImplementerRole;
}) {
  const [supervisor, setSupervisor] = useState<SupervisorsData | null>(null);
  const [dropoutDialog, setDropoutDialog] = useState<boolean>(false);
  const [undropDialog, setUndropDialog] = useState<boolean>(false);
  const [complaintDialog, setComplaintDialog] = useState<boolean>(false);
  const [evaluationDialog, setEvaluationDialog] = useState<boolean>(false);
  const [editDialog, setEditDialog] = useState<boolean>(false);

  const renderDialogAlert = () => {
    return (
      <DialogAlertWidget>
        <div className="flex items-center gap-2">
          <span>{supervisor?.supervisorName}</span>
          <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">{""}</span>
          <span>
            {supervisor?.cellNumber &&
              parsePhoneNumberFromString(supervisor?.cellNumber, "KE")?.formatNational()}
          </span>
        </div>
      </DialogAlertWidget>
    );
  };

  const renderTableActions = () => {
    return role === ImplementerRole.HUB_COORDINATOR ? (
      <div className="flex items-center gap-3">
        <AddNewSupervisor />
      </div>
    ) : null;
  };

  return (
    <div>
      <DataTable
        data={supervisors}
        columns={columns({
          onSupervisorSelect: setSupervisor,
          onEditDialogOpen: () => setEditDialog(true),
          onEvaluationDialogOpen: () => setEvaluationDialog(true),
          onComplaintDialogOpen: () => setComplaintDialog(true),
          onDropoutDialogOpen: () => setDropoutDialog(true),
          onUndropDialogOpen: () => setUndropDialog(true),
          role,
        })}
        className={"data-table data-table-action bg-white lg:mt-4"}
        emptyStateMessage="No supervisors found for this hub"
        columnVisibilityState={{
          checkbox: false,
          Gender: false,
          Status: false,
          county: false,
          subCounty: false,
        }}
        renderTableActions={renderTableActions()}
      />
      <SupervisorDetailsForm
        supervisor={supervisor}
        open={editDialog}
        onOpenChange={setEditDialog}
        mode={role === ImplementerRole.ADMIN ? "view" : "edit"}
      />
      <DropoutSupervisor
        supervisorId={supervisor !== null ? supervisor.id : undefined}
        setDropoutDialog={setDropoutDialog}
        dropoutDialog={dropoutDialog}
      >
        {renderDialogAlert()}
      </DropoutSupervisor>
      <UndropSupervisor
        supervisorId={supervisor !== null ? supervisor.id : undefined}
        setUndropDialog={setUndropDialog}
        undropDialog={undropDialog}
      >
        {renderDialogAlert()}
      </UndropSupervisor>
      <SubmitComplaint
        supervisorId={supervisor !== null ? supervisor.id : undefined}
        setIsOpen={setComplaintDialog}
        isOpen={complaintDialog}
      >
        {renderDialogAlert()}
      </SubmitComplaint>
      <MonthlySupervisorEvaluation
        supervisorId={supervisor !== null ? supervisor.id : undefined}
        setIsOpen={setEvaluationDialog}
        isOpen={evaluationDialog}
        project={supervisor?.hub?.project ?? null}
        evaluations={supervisor?.monthlySupervisorEvaluation ?? []}
        mode={role === ImplementerRole.ADMIN ? "view" : "edit"}
      >
        {renderDialogAlert()}
      </MonthlySupervisorEvaluation>
    </div>
  );
}

export function AllSupervisorsDataTableMenu({
  supervisor,
  onSupervisorSelect,
  onEditDialogOpen,
  onEvaluationDialogOpen,
  onComplaintDialogOpen,
  onDropoutDialogOpen,
  onUndropDialogOpen,
  role,
}: {
  supervisor: SupervisorsData;
  onSupervisorSelect: (supervisor: SupervisorsData) => void;
  onEditDialogOpen: () => void;
  onEvaluationDialogOpen: () => void;
  onComplaintDialogOpen: () => void;
  onDropoutDialogOpen: () => void;
  onUndropDialogOpen: () => void;
  role: ImplementerRole;
}) {
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
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === ImplementerRole.ADMIN ? (
          <>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => {
                onSupervisorSelect(supervisor);
                onEditDialogOpen();
              }}
            >
              View supervisor information
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => {
                onSupervisorSelect(supervisor);
                onEvaluationDialogOpen();
              }}
            >
              View supervisor evaluations
            </DropdownMenuItem>
            <DropdownMenuItem disabled>View complaints</DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => {
                onSupervisorSelect(supervisor);
                onEditDialogOpen();
              }}
            >
              Edit supervisor information
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => {
                onSupervisorSelect(supervisor);
                onEvaluationDialogOpen();
              }}
            >
              Monthly supervisor evaluation
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => {
                onSupervisorSelect(supervisor);
                onComplaintDialogOpen();
              }}
            >
              Submit complaint
            </DropdownMenuItem>
            {/* TODO: Add overall supervisor evaluation */}
            <DropdownMenuItem disabled>Overall supervisor evaluation</DropdownMenuItem>
            {supervisor.droppedOut === null || !supervisor.droppedOut ? (
              <DropdownMenuItem
                onClick={() => {
                  onSupervisorSelect(supervisor);
                  onDropoutDialogOpen();
                }}
              >
                <div className="text-shamiri-red">Drop out supervisor</div>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() => {
                  onSupervisorSelect(supervisor);
                  onUndropDialogOpen();
                }}
              >
                <div>Undo drop out</div>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
