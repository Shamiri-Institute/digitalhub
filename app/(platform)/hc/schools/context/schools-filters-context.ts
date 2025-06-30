import { SESSION_TYPES } from "#/lib/app-constants/constants";
import { type Prisma, SessionStatus } from "@prisma/client";
import { type Dispatch, type SetStateAction, createContext } from "react";

const sessionTypeFilterOptions: { [key: string]: boolean } = {};
SESSION_TYPES.forEach((sessionType) => {
  sessionTypeFilterOptions[sessionType.name] = true;
});

const statusFilterOptions: { [key: string]: boolean } = {};
Object.keys(SessionStatus).forEach((status) => {
  statusFilterOptions[status] = true;
});

export type Filters = {
  sessionTypes: {
    [p: string]: boolean;
  };
  statusTypes: {
    [p: string]: boolean;
  };
  selectedSchool: Prisma.SchoolGetPayload<{
    include: {
      assignedSupervisor: true;
    };
  }> | null;
  setSelectedSchool: Dispatch<
    SetStateAction<Prisma.SchoolGetPayload<{
      include: {
        assignedSupervisor: true;
      };
    }> | null>
  >;
};

export const SchoolsFiltersContext = createContext<{
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
}>({
  filters: {
    sessionTypes: sessionTypeFilterOptions,
    statusTypes: statusFilterOptions,
    selectedSchool: null,
    setSelectedSchool: () => {},
  },
  setFilters: () => {},
});

export { sessionTypeFilterOptions, statusFilterOptions };
