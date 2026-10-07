import { SessionStatus } from "#/db/enums";
import { createContext, type Dispatch, type SetStateAction, useContext } from "react";

export const statusFilterOptions: { [key: string]: boolean } = {};
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
  dateRange?: { start: Date; end: Date };
};

export const FiltersContext = createContext<{
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
} | null>(null);

export function useFilters() {
  const context = useContext(FiltersContext);
  if (!context) {
    throw new Error("useFilters must be used within a FiltersContext provider");
  }
  return context;
}
