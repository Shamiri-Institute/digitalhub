import { SessionStatus } from "#/db/enums";

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
