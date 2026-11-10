"use client";

import type { Dispatch, SetStateAction } from "react";
import type { StudentAttendanceData } from "#/components/common/student/student-attendance";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "#/components/ui/dropdown-menu";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";
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
      <RowActionsTrigger label={`Actions for ${attendance.studentName}`} className="bg-white" />
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
