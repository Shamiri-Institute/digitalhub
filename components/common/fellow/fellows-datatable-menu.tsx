"use client";

import { ImplementerRole } from "#/db/enums";
import type {
  SchoolFellowTableData,
  SchoolFellowTableState,
} from "#/components/common/fellow/columns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

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
      <RowActionsTrigger label={`Actions for ${fellow.fellowName}`} className="bg-white" />
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
