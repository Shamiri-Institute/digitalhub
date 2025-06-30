import type { SupervisorAttendanceTableData } from "#/app/(platform)/hc/components/supervisor-attendance";
import type { Session } from "#/components/common/session/sessions-provider";
import { createContext, type Dispatch, type SetStateAction } from "react";

type SupervisorAttendanceContextData = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  markAttendanceDialog: boolean;
  setMarkAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  session: Session | null;
  setSession: Dispatch<SetStateAction<Session | null>>;
  attendance: SupervisorAttendanceTableData | null;
  setAttendance: Dispatch<SetStateAction<SupervisorAttendanceTableData | null>>;
};

export const SupervisorAttendanceContext =
  createContext<SupervisorAttendanceContextData>({
    isOpen: false,
    setIsOpen: () => {},
    session: null,
    setSession: () => {},
    markAttendanceDialog: false,
    setMarkAttendanceDialog: () => {},
    attendance: null,
    setAttendance: () => {},
  });
