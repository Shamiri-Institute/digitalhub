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

/**
 * Categorical series colours, assigned in this order. The six brand hues pass the dataviz checks
 * (lightness band, chroma, colour-blind separation of neighbours, 3:1 on the card); anything past
 * them is the neutral "other" colour rather than a repeat.
 */
export const SERIES_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
  "var(--color-chart-6)",
];

const OTHER_COLOR = "var(--color-navy-40)";

export function seriesColor(index: number) {
  return SERIES_COLORS[index] ?? OTHER_COLOR;
}

/** Colour of a value from a fixed list, so it keeps its colour whatever else is in the data. */
export function categoryColor(name: string, knownNames: readonly string[]) {
  const index = knownNames.indexOf(name);
  return seriesColor(index === -1 ? knownNames.length : index);
}

/**
 * One navy ramp, light to dark, for series that follow an order (sessions, forms, ages). The
 * light end fades toward the card surface; the steps pass the dataviz ordinal check for 2-9 series.
 */
export function orderedSeriesColor(index: number, count: number) {
  const darkShare = count < 2 ? 100 : Math.round((index / (count - 1)) * 100);
  return `color-mix(in oklab, var(--color-primary) ${darkShare}%, color-mix(in oklab, var(--color-primary) 55%, var(--color-card)))`;
}

export const CASE_STATUS_COLORS = {
  Active: "var(--color-chart-1)",
  FollowUp: "var(--color-chart-3)",
  Terminated: "var(--color-chart-5)",
  Referred: "var(--color-chart-4)",
} as const;
