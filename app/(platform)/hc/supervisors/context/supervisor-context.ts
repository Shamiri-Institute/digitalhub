import { SupervisorsData } from "#/app/(platform)/hc/supervisors/components/columns";
import { createContext, Dispatch, SetStateAction } from "react";

type SupervisorContextData = {
  dropoutDialog: boolean;
  setDropoutDialog: Dispatch<SetStateAction<boolean>>;
  undropDialog: boolean;
  setUndropDialog: Dispatch<SetStateAction<boolean>>;
  supervisor: SupervisorsData | null;
  setSupervisor: Dispatch<SetStateAction<SupervisorsData | null>>;
};

export const SupervisorContext = createContext<SupervisorContextData>({
  dropoutDialog: false,
  setDropoutDialog: () => {},
  undropDialog: false,
  setUndropDialog: () => {},
  supervisor: null,
  setSupervisor: () => {},
});
