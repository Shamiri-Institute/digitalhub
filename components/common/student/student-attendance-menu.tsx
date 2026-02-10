"use client";

import type { Dispatch, SetStateAction } from "react";
import type { StudentAttendanceData } from "#/components/common/student/student-attendance";
import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";

export type StudentAttendanceMenuState = {
  setAttendance: Dispatch<SetStateAction<StudentAttendanceData | undefined>>;
  setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  setTriageStudent: Dispatch<SetStateAction<StudentAttendanceData | undefined>>;
  setTriageModalOpen: Dispatch<SetStateAction<boolean>>;
};

export default function StudentAttendanceMenu({
  state,
  attendance,
  disabled,
}: {
  state: StudentAttendanceMenuState;
  attendance: StudentAttendanceData;
  disabled: boolean;
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
          disabled={disabled}
          onClick={() => {
            state.setAttendance(attendance);
            state.setAttendanceDialog(true);
          }}
        >
          Mark attendance
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            state.setTriageStudent(attendance);
            state.setTriageModalOpen(true);
          }}
        >
          Triage occurred
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
