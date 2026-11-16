"use client";

import type { SupervisorsData, SupervisorTableState } from "#/components/common/supervisor/columns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

export function SupervisorsDataTableMenu({
  supervisor,
  state,
}: {
  supervisor: SupervisorsData;
  state: SupervisorTableState;
}) {
  return (
    <DropdownMenu>
      <RowActionsTrigger label={`Actions for ${supervisor.supervisorName}`} className="bg-white" />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={supervisor.droppedOut !== null && supervisor.droppedOut}
          onClick={() => state.openMarkAttendance(supervisor)}
        >
          Mark attendance
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
