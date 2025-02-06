import { SchoolsTableData } from "#/components/common/schools/columns";
import { createContext, Dispatch, SetStateAction } from "react";

type SchoolsDataContextDataType = {
  schools: SchoolsTableData[];
  setSchools: Dispatch<SetStateAction<SchoolsTableData[]>>;
};

export const SchoolsDataContext = createContext<SchoolsDataContextDataType>({
  schools: [],
  setSchools: () => [],
});
