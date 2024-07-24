import { SchoolsTableData } from "#/app/(platform)/hc/schools/components/columns";
import { createContext, Dispatch, SetStateAction } from "react";

type SchoolInfoContextData = {
  editDialog: boolean;
  setEditDialog: Dispatch<SetStateAction<boolean>>;
  pointSupervisorDialog: boolean;
  setPointSupervisorDialog: Dispatch<SetStateAction<boolean>>;
  schoolDropOutDialog: boolean;
  setSchoolDropOutDialog: Dispatch<SetStateAction<boolean>>;
  undoDropOutDialog: boolean;
  setUndoDropOutDialog: Dispatch<SetStateAction<boolean>>;
  school: SchoolsTableData | null;
  setSchool: Dispatch<SetStateAction<SchoolsTableData | null>>;
};

export const SchoolInfoContext = createContext<SchoolInfoContextData>({
  editDialog: false,
  setEditDialog: () => {},
  pointSupervisorDialog: false,
  setPointSupervisorDialog: () => {},
  schoolDropOutDialog: false,
  setSchoolDropOutDialog: () => {},
  undoDropOutDialog: false,
  setUndoDropOutDialog: () => {},
  school: null,
  setSchool: () => {},
});
