import { SESSION_TYPES } from "#/lib/app-constants/constants";
import { SessionStatus } from "@prisma/client";
import { createContext, Dispatch, SetStateAction } from "react";

const sessionTypeFilterOptions: { [key: string]: boolean } = {};
SESSION_TYPES.forEach((sessionType) => {
  sessionTypeFilterOptions[sessionType.name] = true;
});

const statusFilterOptions: { [key: string]: boolean } = {};
Object.keys(SessionStatus).forEach((status) => {
  statusFilterOptions[status] = true;
});

export type DateRangeType = "day" | "week" | "month";

export type Filters = {
  sessionTypes: {
    [p: string]: boolean;
  };
  statusTypes: {
    [p: string]: boolean;
  };
  dates: DateRangeType;
};

export const FiltersContext = createContext<{
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
}>({
  filters: {
    sessionTypes: sessionTypeFilterOptions,
    statusTypes: statusFilterOptions,
    dates: "week",
  },
  setFilters: () => {},
});

export { sessionTypeFilterOptions, statusFilterOptions };
