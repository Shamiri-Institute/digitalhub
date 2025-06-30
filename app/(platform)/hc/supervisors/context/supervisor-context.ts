import { createContext, type Dispatch, type SetStateAction } from "react";
import type { SupervisorsData } from "#/app/(platform)/hc/supervisors/components/columns";

type SupervisorContextData = {
  editDialog: boolean;
  setEditDialog: Dispatch<SetStateAction<boolean>>;
  evaluationDialog: boolean;
  setEvaluationDialog: Dispatch<SetStateAction<boolean>>;
  complaintDialog: boolean;
  setComplaintDialog: Dispatch<SetStateAction<boolean>>;
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
  complaintDialog: false,
  setComplaintDialog: () => {},
  evaluationDialog: false,
  setEvaluationDialog: () => {},
  dropoutDialog: false,
  setDropoutDialog: () => {},
  undropDialog: false,
  setUndropDialog: () => {},
  supervisor: null,
  setSupervisor: () => {},
});
