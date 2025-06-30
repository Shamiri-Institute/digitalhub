import type { SchoolsTableData } from "#/components/common/schools/columns";
import { createContext, type Dispatch, type SetStateAction } from "react";

type SchoolsDataContextDataType = {
  schools: SchoolsTableData[];
  setSchools: Dispatch<SetStateAction<SchoolsTableData[]>>;
};

export const SchoolsDataContext = createContext<SchoolsDataContextDataType>({
  schools: [],
  setSchools: () => [],
});
