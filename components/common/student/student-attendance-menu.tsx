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
  setTriageReadOnly: Dispatch<SetStateAction<boolean>>;
  setHistoryStudent: Dispatch<SetStateAction<StudentAttendanceData | undefined>>;
  setHistoryModalOpen: Dispatch<SetStateAction<boolean>>;
};

export default function StudentAttendanceMenu({
  state,
  attendance,
  disabled,
  hubVisibleId,
  hasExistingTriageEvent,
}: {
  state: StudentAttendanceMenuState;
  attendance: StudentAttendanceData;
  disabled: boolean;
  hubVisibleId?: string | null;
  hasExistingTriageEvent: boolean;
}) {
  const enabledHubs = (process.env.NEXT_PUBLIC_TRIAGE_ENABLED_HUB_VISIBLE_IDS ?? "")
    .split(",")
    .filter(Boolean);
  const showTriageMenu =
    enabledHubs.length > 0 && !!hubVisibleId && enabledHubs.includes(hubVisibleId);

  const openTriageModal = (readOnly: boolean) => {
    state.setTriageReadOnly(readOnly);
    state.setTriageStudent(attendance);
    state.setTriageModalOpen(true);
  };

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
        {showTriageMenu && !hasExistingTriageEvent && (
          <DropdownMenuItem onClick={() => openTriageModal(false)}>
            Triage occurred
          </DropdownMenuItem>
        )}
        {showTriageMenu && hasExistingTriageEvent && (
          <>
            <DropdownMenuItem onClick={() => openTriageModal(false)}>Edit triage</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openTriageModal(true)}>View triage</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                state.setHistoryStudent(attendance);
                state.setHistoryModalOpen(true);
              }}
            >
              View student history
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
