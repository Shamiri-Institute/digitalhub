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
  openTriageModal: (triageTarget: StudentAttendanceData, readOnly: boolean) => void;
  openHistory: (student: StudentAttendanceData) => void;
};

/**
 * The student's triage at the session. "unavailable" when the caller doesn't triage, or when the
 * session's triage records failed to load, so whether the student has one is unknown.
 */
export type StudentTriage = "unavailable" | "none" | "documented";

export default function StudentAttendanceMenu({
  state,
  attendance,
  disabled,
  triage,
}: {
  state: StudentAttendanceMenuState;
  attendance: StudentAttendanceData;
  disabled: boolean;
  triage: StudentTriage;
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
        {triage === "none" && (
          <DropdownMenuItem onClick={() => state.openTriageModal(attendance, false)}>
            Triage occurred
          </DropdownMenuItem>
        )}
        {triage === "documented" && (
          <>
            <DropdownMenuItem onClick={() => state.openTriageModal(attendance, false)}>
              Edit triage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => state.openTriageModal(attendance, true)}>
              View triage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => state.openHistory(attendance)}>
              View student triage history
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
