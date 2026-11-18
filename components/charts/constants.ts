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
 * Categorical series colours: the Figma chart hues first, then two darker steps of blue and orange.
 * Assigned in this order and never cycled past the end. The order keeps neighbouring colours, and
 * the first and last slices of a donut, apart for colour-blind readers.
 */
export const SERIES_COLORS = [
  "var(--color-shamiri-graph-blue)",
  "var(--color-shamiri-graph-green)",
  "var(--color-shamiri-graph-purple)",
  "var(--color-shamiri-graph-red)",
  "var(--color-shamiri-light-orange)",
  "var(--color-shamiri-graph-yellow)",
  "var(--color-shamiri-new-blue)",
  "var(--color-shamiri-dark-orange)",
];

/** Fill for the slice that folds every category past the palette, so no two categories share a hue. */
export const OTHER_COLOR = "var(--color-shamiri-text-grey)";

/**
 * Colours a part-of-whole breakdown. When it has more categories than SERIES_COLORS, the largest
 * keep a hue each and the rest are summed into one grey "Other".
 */
export function foldIntoOther<T extends { name: string; value: number }>(slices: T[]) {
  if (slices.length <= SERIES_COLORS.length) {
    return slices.map((slice, index) => ({ ...slice, fill: SERIES_COLORS[index] }));
  }
  const bySize = slices.toSorted((a, b) => b.value - a.value);
  const kept = bySize.slice(0, SERIES_COLORS.length - 1);
  const otherValue = bySize.slice(kept.length).reduce((sum, slice) => sum + slice.value, 0);
  return [
    ...kept.map((slice, index) => ({
      name: slice.name,
      value: slice.value,
      fill: SERIES_COLORS[index],
    })),
    { name: "Other", value: otherValue, fill: OTHER_COLOR },
  ];
}

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
  return `color-mix(in oklab, var(--color-shamiri-dark-blue) ${darkShare}%, color-mix(in oklab, var(--color-shamiri-graph-blue) 70%, var(--color-card)))`;
}

export const CASE_STATUS_COLORS = {
  Active: "var(--color-shamiri-graph-blue)",
  FollowUp: "var(--color-shamiri-light-orange)",
  Terminated: "var(--color-shamiri-graph-green)",
  Referred: "var(--color-shamiri-graph-purple)",
} as const;
