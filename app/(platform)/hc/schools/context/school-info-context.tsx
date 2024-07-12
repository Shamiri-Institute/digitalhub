import { SchoolsTableData } from "#/app/(platform)/hc/schools/components/columns";
import { createContext, Dispatch, SetStateAction } from "react";

type SchoolInfoContextData = {
  editDialog: boolean;
  setEditDialog: Dispatch<SetStateAction<boolean>>;
  school: SchoolsTableData | null;
  setSchool: Dispatch<SetStateAction<SchoolsTableData | null>>;
};

export const SchoolInfoContext = createContext<SchoolInfoContextData>({
  editDialog: false,
  setEditDialog: () => {},
  school: null,
  setSchool: () => {},
});
