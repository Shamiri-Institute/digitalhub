"use client";

import { ImplementerRole } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";
import type { SchoolFellowTableData } from "#/components/common/fellow/columns";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export function FellowsDatatableMenu({
  fellow,
  state,
  role,
}: {
  fellow: SchoolFellowTableData;
  state: {
    setFellow: Dispatch<SetStateAction<SchoolFellowTableData | undefined>>;
    setDetailsDialog: Dispatch<SetStateAction<boolean>>;
    setReplaceDialog: Dispatch<SetStateAction<boolean>>;
    setStudentsDialog: Dispatch<SetStateAction<boolean>>;
    setAttendanceHistoryDialog: Dispatch<SetStateAction<boolean>>;
    setAssignSupervisorDialog: Dispatch<SetStateAction<boolean>>;
  };
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
        <DropdownMenuItem
          onClick={() => {
            state.setFellow(fellow);
            state.setDetailsDialog(true);
          }}
        >
          {role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.ADMIN
            ? "View fellow information"
            : role === ImplementerRole.SUPERVISOR
              ? "Edit fellow information"
              : null}
        </DropdownMenuItem>
        {role === ImplementerRole.HUB_COORDINATOR && (
          <DropdownMenuItem
            disabled={fellow.droppedOut ?? undefined}
            onClick={() => {
              state.setFellow(fellow);
              state.setAssignSupervisorDialog(true);
            }}
          >
            Assign supervisor
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={fellow.groupId === null}
          onClick={() => {
            state.setFellow(fellow);
            state.setStudentsDialog(true);
          }}
        >
          View students in group
        </DropdownMenuItem>
        {(role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.SUPERVISOR) && (
          <DropdownMenuItem
            disabled={fellow.groupId === null}
            onClick={() => {
              state.setFellow(fellow);
              state.setReplaceDialog(true);
            }}
          >
            Replace fellow
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            state.setFellow(fellow);
            state.setAttendanceHistoryDialog(true);
          }}
        >
          Session attendance history
        </DropdownMenuItem>
        <DropdownMenuItem>View complaints</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
