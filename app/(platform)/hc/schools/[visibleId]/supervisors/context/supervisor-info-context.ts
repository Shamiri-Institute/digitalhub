import { SupervisorsData } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import { createContext, Dispatch, SetStateAction } from "react";

type SupervisorInfoContextData = {
  dropoutDialog: boolean;
  setDropoutDialog: Dispatch<SetStateAction<boolean>>;
  supervisor: SupervisorsData | null;
  setSupervisor: Dispatch<SetStateAction<SupervisorsData | null>>;
};

export const SupervisorInfoContext = createContext<SupervisorInfoContextData>({
  dropoutDialog: false,
  setDropoutDialog: () => {},
  supervisor: null,
  setSupervisor: () => {},
});
