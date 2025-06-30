import type { SupervisorsData } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import { createContext, type Dispatch, type SetStateAction } from "react";

type SupervisorInfoContextData = {
  dropoutDialog: boolean;
  setDropoutDialog: Dispatch<SetStateAction<boolean>>;
  undropDialog: boolean;
  setUndropDialog: Dispatch<SetStateAction<boolean>>;
  attendanceDialog: boolean;
  setAttendanceDialog: Dispatch<SetStateAction<boolean>>;
  supervisor: SupervisorsData | null;
  setSupervisor: Dispatch<SetStateAction<SupervisorsData | null>>;
};

export const SupervisorInfoContext = createContext<SupervisorInfoContextData>({
  dropoutDialog: false,
  setDropoutDialog: () => {},
  undropDialog: false,
  setUndropDialog: () => {},
  attendanceDialog: false,
  setAttendanceDialog: () => {},
  supervisor: null,
  setSupervisor: () => {},
});
