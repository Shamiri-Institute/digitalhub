"use client";

import { createContext, type Dispatch, type SetStateAction } from "react";
import type { SchoolsTableData } from "#/components/common/schools/columns";

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
