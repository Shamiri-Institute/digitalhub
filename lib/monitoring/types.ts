export type MonitoringFilters = {
  projectId: string;
  hubId: string;
  schoolId: string | null;
  supervisorId: string | null;
  fellowId: string | null;
  timeZone: string;
};

export type CardCell = string | number | boolean | null;
export type CardRow = Record<string, CardCell>;

export type ChartSeries = { key: string; label: string };
export type TableColumn = { key: string; label: string };

type CartesianView = {
  x: string;
  xLabel?: string;
  yLabel?: string;
  stacked?: boolean;
  /** Values are 0-1 fractions, shown as percentages. */
  percent?: boolean;
  /** A reference line, in the same units as the values. */
  goal?: number;
  /** Series follow an order (sessions), so they share one hue from light to dark. */
  ordered?: boolean;
} & (
  | { series: ChartSeries[] }
  /** One series per distinct value of `breakout`, for rows shaped (x, breakout, value). */
  | { breakout: string; value: string }
);

export type CardView =
  | ({ kind: "bar" } & CartesianView)
  | ({ kind: "line" } & CartesianView)
  | { kind: "pie"; name: string; value: string }
  | { kind: "table"; columns: TableColumn[] }
  | { kind: "scalar"; value: string }
  | { kind: "progress"; value: string; goal: number }
  | { kind: "pivot"; row: string; rowLabel: string; column: string; value: string };

export type MonitoringCard = {
  metabaseCardId: number;
  title: string;
  description?: string;
  /** Width on Metabase's 24-column grid. */
  width: 8 | 12 | 24;
  view: CardView;
  /** Set on cards whose logic is one-off to a term: hardcoded dates, schools or supervisors. */
  onlyForProjectVisibleId?: string;
  load: (filters: MonitoringFilters) => Promise<CardRow[]>;
};

export type MonitoringSection = { heading?: string; cards: MonitoringCard[] };

export type MonitoringTab = { slug: string; title: string; sections: MonitoringSection[] };
