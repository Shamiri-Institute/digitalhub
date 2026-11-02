"use client";

import { ImplementerRole } from "#/db/enums";
import type {
  SchoolFellowTableData,
  SchoolFellowTableState,
} from "#/components/common/fellow/columns";
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
  state: SchoolFellowTableState;
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
        <DropdownMenuItem onClick={() => state.openDetailsDialog(fellow)}>
          {role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.ADMIN
            ? "View fellow information"
            : role === ImplementerRole.SUPERVISOR
              ? "Edit fellow information"
              : null}
        </DropdownMenuItem>
        {role === ImplementerRole.HUB_COORDINATOR && (
          <DropdownMenuItem
            disabled={fellow.droppedOut ?? undefined}
            onClick={() => state.openDialog("assignSupervisor", fellow)}
          >
            Assign supervisor
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={fellow.groupId === null}
          onClick={() => state.openDialog("students", fellow)}
        >
          View students in group
        </DropdownMenuItem>
        {(role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.SUPERVISOR) && (
          <DropdownMenuItem
            disabled={fellow.groupId === null}
            onClick={() => state.openDialog("replace", fellow)}
          >
            Replace fellow
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => state.openDialog("attendanceHistory", fellow)}>
          Session attendance history
        </DropdownMenuItem>
        <DropdownMenuItem>View complaints</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
