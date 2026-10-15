"use client";

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
