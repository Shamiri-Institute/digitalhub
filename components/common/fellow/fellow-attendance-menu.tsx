"use client";

import type { Dispatch, SetStateAction } from "react";
import type { FellowAttendancesTableData } from "#/components/common/fellow/fellow-attendance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

export default function FellowAttendanceMenu({
  state,
  attendance,
  disabled,
}: {
  state: {
    setAttendance: Dispatch<SetStateAction<FellowAttendancesTableData | undefined>>;
    setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  };
  attendance: FellowAttendancesTableData;
  disabled: boolean;
}) {
  return (
    <DropdownMenu>
      <RowActionsTrigger label={`Actions for ${attendance.fellowName}`} className="bg-white" />
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <span className="text-xs font-medium uppercase text-muted-foreground">Actions</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={disabled}
          onClick={() => {
            state.setAttendance(attendance);
            state.setAttendanceDialog(true);
          }}
        >
          Mark attendance
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
