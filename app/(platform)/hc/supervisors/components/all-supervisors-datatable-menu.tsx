"use client";

import { ImplementerRole } from "#/db/enums";
import type {
  SupervisorDialogKind,
  SupervisorsData,
} from "#/app/(platform)/hc/supervisors/components/columns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

export function AllSupervisorsDataTableMenu({
  supervisor,
  openDialog,
  role,
}: {
  supervisor: SupervisorsData;
  openDialog: (kind: SupervisorDialogKind, supervisor: SupervisorsData) => void;
  role: ImplementerRole;
}) {
  return (
    <DropdownMenu>
      <RowActionsTrigger label={`Actions for ${supervisor.supervisorName}`} className="bg-white" />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-shamiri-text-grey">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === ImplementerRole.ADMIN ? (
          <>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => openDialog("edit", supervisor)}
            >
              View supervisor information
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => openDialog("evaluation", supervisor)}
            >
              View supervisor evaluations
            </DropdownMenuItem>
            <DropdownMenuItem disabled>View complaints</DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => openDialog("edit", supervisor)}
            >
              Edit supervisor information
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => openDialog("evaluation", supervisor)}
            >
              Monthly supervisor evaluation
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
              onClick={() => openDialog("complaint", supervisor)}
            >
              Submit complaint
            </DropdownMenuItem>
            {/* TODO: Add overall supervisor evaluation */}
            <DropdownMenuItem disabled>Overall supervisor evaluation</DropdownMenuItem>
            {supervisor.droppedOut === null || !supervisor.droppedOut ? (
              <DropdownMenuItem onClick={() => openDialog("dropout", supervisor)}>
                <div className="text-shamiri-red">Drop out supervisor</div>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => openDialog("undrop", supervisor)}>
                <div>Undo drop out</div>
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
