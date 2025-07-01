import { createContext, type Dispatch, type SetStateAction } from "react";
import type { SchoolsTableData } from "#/components/common/schools/columns";

type SchoolsDataContextDataType = {
  schools: SchoolsTableData[];
  setSchools: Dispatch<SetStateAction<SchoolsTableData[]>>;
};

export const SchoolsDataContext = createContext<SchoolsDataContextDataType>({
  schools: [],
  setSchools: () => [],
});
