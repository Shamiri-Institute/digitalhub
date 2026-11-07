export const possibleSessions = [
  "Pre",
  "S1",
  "S2",
  "S3",
  "S4",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
];

export const possibleInterventionSessions = ["s0", "s1", "s2", "s3", "s4"];

/** "s0" is the pre-session; "s3" becomes "S3". Other values pass through. */
export function sessionLabel(sessionName: string) {
  if (sessionName === "s0") return "Pre";
  return /^s\d+$/.test(sessionName) ? sessionName.toUpperCase() : sessionName;
}

/** Categorical series colours, assigned in this order and never cycled past the end. */
export const SERIES_COLORS = [
  "var(--color-shamiri-new-blue)",
  "var(--color-shamiri-graph-green)",
  "var(--color-shamiri-graph-yellow)",
  "var(--color-shamiri-graph-purple)",
  "var(--color-shamiri-red)",
  "var(--color-shamiri-dark-blue)",
  "var(--color-shamiri-light-orange)",
  "var(--color-shamiri-light-blue)",
];

/** Colour of a value from a fixed list, so it keeps its colour whatever else is in the data. */
export function categoryColor(name: string, knownNames: readonly string[]) {
  const index = knownNames.indexOf(name);
  return SERIES_COLORS[index === -1 ? knownNames.length : index];
}

/**
 * One blue ramp, light to dark, for series that follow an order (sessions, forms, ages). The
 * light end fades toward the card surface; the steps pass the dataviz ordinal check for 2-9 series.
 */
export function orderedSeriesColor(index: number, count: number) {
  const darkShare = count < 2 ? 100 : Math.round((index / (count - 1)) * 100);
  return `color-mix(in oklab, var(--color-shamiri-dark-blue) ${darkShare}%, color-mix(in oklab, var(--color-shamiri-blue) 55%, var(--color-card)))`;
}

export const CASE_STATUS_COLORS = {
  Active: "var(--color-shamiri-new-blue)",
  FollowUp: "var(--color-shamiri-light-orange)",
  Terminated: "var(--color-shamiri-graph-green)",
  Referred: "var(--color-shamiri-graph-purple)",
} as const;
