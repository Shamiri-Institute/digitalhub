import { SessionStatus } from "@prisma/client";
import { createContext, type Dispatch, type SetStateAction } from "react";

const sessionTypeFilterOptions: { [key: string]: boolean } = {};

const statusFilterOptions: { [key: string]: boolean } = {};
Object.keys(SessionStatus).forEach((status) => {
  statusFilterOptions[status] = true;
});

export type DateRangeType = "day" | "week" | "month";

const dates: DateRangeType = "week";

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
    dates,
  },
  setFilters: () => {},
});

export { sessionTypeFilterOptions, statusFilterOptions };
