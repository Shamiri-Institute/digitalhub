"use client";

import { ImplementerRole } from "#/db/enums";
import type { project as projectTable } from "#/db/schema";
import parsePhoneNumberFromString from "libphonenumber-js";
import { type SetStateAction, useState } from "react";
import AddNewSupervisor from "#/app/(platform)/hc/supervisors/components/add-new-supervisor";
import {
  columns,
  type SupervisorDialogKind,
  type SupervisorsData,
} from "#/app/(platform)/hc/supervisors/components/columns";
import DropoutSupervisor from "#/app/(platform)/hc/supervisors/components/dropout-supervisor-form";
import MonthlySupervisorEvaluation from "#/app/(platform)/hc/supervisors/components/monthly-supervisor-evaluation";
import SubmitComplaint from "#/app/(platform)/hc/supervisors/components/submit-complaint";
import SupervisorDetailsForm from "#/app/(platform)/hc/supervisors/components/supervisor-details-form";
import UndropSupervisor from "#/app/(platform)/hc/supervisors/components/undrop-supervisor-form";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import DataTable from "#/components/data-table";

type OpenSupervisorDialog = { kind: SupervisorDialogKind; supervisorId: string };

export default function MainSupervisorsDataTable({
  supervisors,
  project,
  role,
}: {
  supervisors: SupervisorsData[];
  project: Pick<typeof projectTable.$inferSelect, "actualStartDate" | "actualEndDate"> | null;
  role: ImplementerRole;
}) {
  const [dialog, setDialog] = useState<OpenSupervisorDialog | null>(null);
  const supervisor = dialog && supervisors.find((s) => s.id === dialog.supervisorId);

  const onDialogOpenChange = (open: SetStateAction<boolean>) => {
    if (!open) setDialog(null);
  };

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
          openDialog: (kind, { id: supervisorId }) => setDialog({ kind, supervisorId }),
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
      {supervisor && (
        <>
          <SupervisorDetailsForm
            supervisor={supervisor}
            open={dialog?.kind === "edit"}
            onOpenChange={onDialogOpenChange}
            mode={role === ImplementerRole.ADMIN ? "view" : "edit"}
          />
          <DropoutSupervisor
            supervisorId={supervisor.id}
            setDropoutDialog={onDialogOpenChange}
            dropoutDialog={dialog?.kind === "dropout"}
          >
            {renderDialogAlert()}
          </DropoutSupervisor>
          <UndropSupervisor
            supervisorId={supervisor.id}
            setUndropDialog={onDialogOpenChange}
            undropDialog={dialog?.kind === "undrop"}
          >
            {renderDialogAlert()}
          </UndropSupervisor>
          <SubmitComplaint
            supervisorId={supervisor.id}
            setIsOpen={onDialogOpenChange}
            isOpen={dialog?.kind === "complaint"}
          >
            {renderDialogAlert()}
          </SubmitComplaint>
          <MonthlySupervisorEvaluation
            supervisorId={supervisor.id}
            setIsOpen={onDialogOpenChange}
            isOpen={dialog?.kind === "evaluation"}
            project={project}
            evaluations={supervisor.monthlySupervisorEvaluation}
            mode={role === ImplementerRole.ADMIN ? "view" : "edit"}
          >
            {renderDialogAlert()}
          </MonthlySupervisorEvaluation>
        </>
      )}
    </div>
  );
}
