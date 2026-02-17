"use client";

import { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import type { SupervisorsData } from "#/components/common/supervisor/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export function SupervisorsDataTableMenu({
  supervisor,
  state,
}: {
  supervisor: SupervisorsData;
  state: {
    setMarkAttendanceDialog: Dispatch<SetStateAction<boolean>>;
    setSupervisor: Dispatch<SetStateAction<SupervisorsData | null>>;
    role: ImplementerRole;
  };
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
        <DropdownMenuItem
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
          onClick={() => {
            state.setSupervisor(supervisor);
            state.setMarkAttendanceDialog(true);
          }}
        >
          Mark attendance
        </DropdownMenuItem>
        {/* TODO: Remove drop out option and refactor context*/}
        {state.role === ImplementerRole.HUB_COORDINATOR &&
          (supervisor.droppedOut === null || !supervisor.droppedOut ? (
            <DropdownMenuItem
              onClick={() => {
                state.setSupervisor(supervisor);
                // state.setDropoutDialog(true);
              }}
            >
              <div className="text-shamiri-red">Drop out supervisor</div>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => {
                state.setSupervisor(supervisor);
                // state.setUndropDialog(true);
              }}
            >
              <div>Undo drop out</div>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
