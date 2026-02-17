"use client";

import { ImplementerRole } from "@prisma/client";
import type { SupervisorsData } from "#/app/(platform)/hc/supervisors/components/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

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
