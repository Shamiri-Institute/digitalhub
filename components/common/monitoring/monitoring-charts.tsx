import { orderedSeriesColor, seriesColor } from "#/components/charts/constants";
import { ColumnChart, LineChart, RingBreakdown } from "#/components/charts/static-charts";
import {
  formatCell,
  pivotRowsBySeries,
  type SupervisorEmphasis,
  YOU_SUFFIX,
} from "#/components/common/monitoring/card-cells";
import type { CardCell, CardRow, CardView, ChartSeries } from "#/lib/monitoring/types";

type DrawnSeries = ChartSeries & { colorIndex: number; muted?: boolean; stackId?: string };

function youBesideHub(
  hubRows: CardRow[],
  hubSeries: ChartSeries[],
  ownRows: CardRow[],
  ownSeries: ChartSeries[],
  x: string,
  stacked: boolean | undefined,
) {
  const series = [
    ...hubSeries,
    ...ownSeries.filter((own) => !hubSeries.some((hub) => hub.key === own.key)),
  ];
  const rowsByX = new Map<string, CardRow>();
  const addRows = (rows: CardRow[], scope: "you" | "hub") => {
    for (const row of rows) {
      const xValue = formatCell(row[x]);
      const merged = rowsByX.get(xValue) ?? { [x]: xValue };
      for (const { key } of series) merged[`${scope}:${key}`] = row[key] ?? null;
      rowsByX.set(xValue, merged);
    }
  };
  addRows(hubRows, "hub");
  addRows(ownRows, "you");
  const drawnSeries = series.flatMap(({ key, label }, colorIndex): DrawnSeries[] => [
    {
      key: `you:${key}`,
      label: series.length === 1 ? "You" : `You: ${label}`,
      colorIndex,
      stackId: stacked ? "you" : undefined,
    },
    {
      key: `hub:${key}`,
      label: series.length === 1 ? "Hub" : `Hub: ${label}`,
      colorIndex,
      muted: true,
      stackId: stacked ? "hub" : undefined,
    },
  ]);
  return { chartRows: [...rowsByX.values()], drawnSeries };
}

/** One colour for the viewer's bars and a muted one for the rest, sharing a stack so widths match. */
function highlightOwnBars(
  rows: CardRow[],
  series: ChartSeries,
  x: string,
  isOwn: (xValue: string) => boolean,
  ownSuffix: string,
) {
  const ownKey = `own:${series.key}`;
  const chartRows = rows.map((row) => {
    const xValue = formatCell(row[x]);
    if (!isOwn(xValue)) return row;
    const label = xValue.endsWith(ownSuffix) ? xValue : `${xValue}${ownSuffix}`;
    return { ...row, [x]: label, [ownKey]: row[series.key] ?? null, [series.key]: null };
  });
  const drawnSeries: DrawnSeries[] = [
    { key: ownKey, label: "You", colorIndex: 0, stackId: "bars" },
    { ...series, colorIndex: 0, muted: true, stackId: "bars" },
  ];
  return { chartRows, drawnSeries };
}

function seriesOf(rows: CardRow[], view: Extract<CardView, { kind: "bar" | "line" }>) {
  return "breakout" in view
    ? pivotRowsBySeries(rows, view.x, view.breakout, view.value)
    : { chartRows: rows, chartSeries: view.series };
}

function drawnChart(
  rows: CardRow[],
  view: Extract<CardView, { kind: "bar" | "line" }>,
  emphasis: SupervisorEmphasis | undefined,
) {
  const { chartRows, chartSeries } = seriesOf(rows, view);
  const onlySeries = chartSeries.length === 1 ? chartSeries[0] : undefined;
  if (emphasis?.ownRows && view.x === "fellowName" && onlySeries) {
    const ownFellows = new Set(emphasis.ownRows.map((row) => formatCell(row[view.x])));
    return highlightOwnBars(
      chartRows,
      onlySeries,
      view.x,
      (name) => ownFellows.has(name),
      " (Yours)",
    );
  }
  if (emphasis?.ownRows) {
    const own = seriesOf(emphasis.ownRows, view);
    return youBesideHub(
      chartRows,
      chartSeries,
      own.chartRows,
      own.chartSeries,
      view.x,
      view.stacked,
    );
  }
  if (emphasis && view.x === "supervisorName" && onlySeries) {
    return highlightOwnBars(
      chartRows,
      onlySeries,
      view.x,
      (name) => name === `${emphasis.ownSupervisorName}${YOU_SUFFIX}`,
      YOU_SUFFIX,
    );
  }
  return {
    chartRows,
    drawnSeries: chartSeries.map((series, colorIndex): DrawnSeries => ({
      ...series,
      colorIndex,
      stackId: view.stacked ? "stack" : undefined,
    })),
  };
}

const formatPercent = (value: number) =>
  `${(value * 100).toLocaleString("en", { maximumFractionDigits: 1 })}%`;

function numberOrNull(cell: CardCell | undefined) {
  if (cell === null || cell === undefined || cell === "") return null;
  const value = Number(cell);
  return Number.isNaN(value) ? null : value;
}

export function CartesianChart({
  title,
  rows,
  view,
  emphasis,
}: {
  title: string;
  rows: CardRow[];
  view: Extract<CardView, { kind: "bar" | "line" }>;
  emphasis: SupervisorEmphasis | undefined;
}) {
  const { chartRows, drawnSeries } = drawnChart(rows, view, emphasis);
  const colorCount = Math.max(...drawnSeries.map(({ colorIndex }) => colorIndex)) + 1;
  const series = drawnSeries.map(({ label, colorIndex, muted, stackId }) => ({
    name: label,
    color: view.ordered ? orderedSeriesColor(colorIndex, colorCount) : seriesColor(colorIndex),
    muted,
    stack: stackId,
  }));
  const categories = chartRows.map((row) => ({
    name: formatCell(row[view.x]),
    values: drawnSeries.map(({ key }) => numberOrNull(row[key])),
  }));
  const formatValue = view.percent ? formatPercent : formatCell;
  return (
    <div className="h-80 w-full">
      {view.kind === "bar" ? (
        <ColumnChart
          label={title}
          categories={categories}
          series={series}
          formatValue={formatValue}
          minimumTop={view.percent ? 1 : undefined}
          goal={view.goal}
          valueLabels={!view.stacked}
          xLabel={view.xLabel}
          yLabel={view.yLabel}
        />
      ) : (
        <LineChart
          label={title}
          categories={categories}
          series={series}
          formatValue={formatValue}
          minimumTop={view.percent ? 1 : undefined}
          xLabel={view.xLabel}
          yLabel={view.yLabel}
        />
      )}
    </div>
  );
}

export function PieCard({
  title,
  rows,
  name,
  value,
}: {
  title: string;
  rows: CardRow[];
  name: string;
  value: string;
}) {
  return (
    <div className="h-80 w-full">
      <RingBreakdown
        label={title}
        formatValue={formatCell}
        slices={rows.map((row, index) => ({
          name: row[name] === null ? "Not recorded" : formatCell(row[name]),
          value: Number(row[value] ?? 0),
          color: seriesColor(index),
        }))}
      />
    </div>
  );
}
