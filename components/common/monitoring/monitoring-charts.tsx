"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SERIES_COLORS, orderedSeriesColor } from "#/components/charts/constants";
import {
  formatCell,
  pivotRowsBySeries,
  type SupervisorEmphasis,
  YOU_SUFFIX,
} from "#/components/common/monitoring/card-cells";
import type { CardRow, CardView, ChartSeries } from "#/lib/monitoring/types";

const MUTED_OPACITY = 0.35;
const MAX_BARS_WITH_LABELS = 24;

function seriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

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

type LegendItem = { key: string; label: string; color: string | undefined; muted?: boolean };

function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-shamiri-text-dark-grey">
      {items.map(({ key, label, color, muted }) => (
        <li key={key} className="flex items-center gap-1.5">
          <svg aria-hidden="true" className="size-3" viewBox="0 0 12 12">
            <rect width="12" height="12" fill={color} fillOpacity={muted ? MUTED_OPACITY : 1} />
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
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
  const coloredSeries = drawnSeries.map((series) => ({
    ...series,
    color: view.ordered
      ? orderedSeriesColor(series.colorIndex, colorCount)
      : seriesColor(series.colorIndex),
  }));
  const formatValue = (value: unknown) =>
    view.percent
      ? `${(Number(value) * 100).toLocaleString("en", { maximumFractionDigits: 1 })}%`
      : formatCell(typeof value === "number" ? value : null);
  const formatBarLabel = (value: unknown) =>
    value === null || value === undefined ? "" : formatValue(value);
  // Recharts drops crowded ticks, which could be the viewer's own bar. A chart per fellow has too
  // many bars to name, so its colour and tooltip identify them.
  const barsMarkOwn = drawnSeries.some(({ key }) => key.startsWith("own:"));
  const axisForOwnBars = !barsMarkOwn
    ? {}
    : view.x === "fellowName"
      ? { tick: false }
      : { interval: 0, angle: -30, textAnchor: "end" as const, height: 80 };
  const showsBarLabels = !view.stacked && chartRows.length <= MAX_BARS_WITH_LABELS;
  const axes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis
        dataKey={(row: CardRow) => formatCell(row[view.x])}
        tick={{ fontSize: 11 }}
        {...axisForOwnBars}
      >
        {view.xLabel && <Label value={view.xLabel} position="insideBottom" offset={-4} />}
      </XAxis>
      <YAxis
        tick={{ fontSize: 11 }}
        tickFormatter={formatValue}
        allowDecimals={Boolean(view.percent)}
        domain={view.percent ? [0, 1] : undefined}
      >
        {view.yLabel && (
          <Label value={view.yLabel} angle={-90} position="insideLeft" textAnchor="middle" />
        )}
      </YAxis>
      <Tooltip formatter={formatValue} />
      {coloredSeries.length > 1 && <Legend content={<ChartLegend items={coloredSeries} />} />}
      {view.goal !== undefined && (
        <ReferenceLine y={view.goal} stroke="var(--color-shamiri-red)" strokeDasharray="4 4" />
      )}
    </>
  );
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {view.kind === "bar" ? (
          <BarChart data={chartRows} aria-label={title}>
            {axes}
            {coloredSeries.map(({ key, label, color, muted, stackId }) => (
              <Bar
                key={key}
                dataKey={(row: CardRow) => row[key]}
                name={label}
                fill={color}
                fillOpacity={muted ? MUTED_OPACITY : 1}
                maxBarSize={96}
                stackId={stackId}
                label={
                  showsBarLabels
                    ? { position: "top", fontSize: 11, formatter: formatBarLabel }
                    : undefined
                }
              />
            ))}
          </BarChart>
        ) : (
          <LineChart data={chartRows} aria-label={title}>
            {axes}
            {coloredSeries.map(({ key, label, color, muted }) => (
              <Line
                key={key}
                dataKey={(row: CardRow) => row[key]}
                name={label}
                stroke={color}
                strokeOpacity={muted ? MUTED_OPACITY : 1}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
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
  const pieRows = rows.map((row, index) => ({
    name: row[name] === null ? "Not recorded" : formatCell(row[name]),
    value: Number(row[value] ?? 0),
    fill: seriesColor(index),
  }));
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart aria-label={title}>
          <Pie
            data={pieRows}
            dataKey="value"
            nameKey="name"
            label={{ fill: "var(--color-shamiri-text-dark-grey)", fontSize: 12 }}
          />
          <Tooltip />
          <Legend
            content={
              <ChartLegend
                items={pieRows.map((pieRow) => ({
                  key: pieRow.name,
                  label: pieRow.name,
                  color: pieRow.fill,
                }))}
              />
            }
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
