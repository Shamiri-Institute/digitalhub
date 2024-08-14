import { SupervisorsData } from "#/app/(platform)/hc/supervisors/components/columns";
import { createContext, Dispatch, SetStateAction } from "react";

type SupervisorContextData = {
  editDialog: boolean;
  setEditDialog: Dispatch<SetStateAction<boolean>>;
  dropoutDialog: boolean;
  setDropoutDialog: Dispatch<SetStateAction<boolean>>;
  undropDialog: boolean;
  setUndropDialog: Dispatch<SetStateAction<boolean>>;
  supervisor: SupervisorsData | null;
  setSupervisor: Dispatch<SetStateAction<SupervisorsData | null>>;
};

export const SupervisorContext = createContext<SupervisorContextData>({
  editDialog: false,
  setEditDialog: () => {},
  dropoutDialog: false,
  setDropoutDialog: () => {},
  undropDialog: false,
  setUndropDialog: () => {},
  supervisor: null,
  setSupervisor: () => {},
});
