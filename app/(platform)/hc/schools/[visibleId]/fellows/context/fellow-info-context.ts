"use client";

import type { SchoolFellowTableData } from "#/components/common/fellow/columns";
import { createContext, type Dispatch, type SetStateAction } from "react";

type FellowInfoContextData = {
  groupDialog: boolean;
  setGroupDialog: Dispatch<SetStateAction<boolean>>;
  addStudentDialog: boolean;
  setAddStudentDialog: Dispatch<SetStateAction<boolean>>;
  attendanceHistoryDialog: boolean;
  setAttendanceHistoryDialog: Dispatch<SetStateAction<boolean>>;
  assignSupervisor: boolean;
  setAssignSupervisor: Dispatch<SetStateAction<boolean>>;
  fellow: SchoolFellowTableData | null;
  setFellow: Dispatch<SetStateAction<SchoolFellowTableData | null>>;
};

export const FellowInfoContext = createContext<FellowInfoContextData>({
  groupDialog: false,
  setGroupDialog: () => {},
  addStudentDialog: false,
  setAddStudentDialog: () => {},
  attendanceHistoryDialog: false,
  setAttendanceHistoryDialog: () => {},
  fellow: null,
  setFellow: () => {},
  assignSupervisor: false,
  setAssignSupervisor: () => {},
});
