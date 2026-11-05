"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
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
import DataTable from "#/components/data-table";
import type { CardCell, CardRow, CardView, ChartSeries, TableColumn } from "#/lib/monitoring/types";

const SERIES_COLORS = [
  "var(--color-shamiri-new-blue)",
  "var(--color-shamiri-graph-green)",
  "var(--color-shamiri-graph-yellow)",
  "var(--color-shamiri-graph-purple)",
  "var(--color-shamiri-red)",
  "var(--color-shamiri-dark-blue)",
  "var(--color-shamiri-text-grey)",
  "var(--color-shamiri-light-blue)",
];

const MUTED_OPACITY = 0.35;
const YOU_SUFFIX = " (You)";
const MAX_BARS_WITH_LABELS = 24;

export type SupervisorEmphasis = { ownSupervisorName: string; ownRows?: CardRow[] };

function seriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function formatCell(cell: CardCell | undefined) {
  if (cell === null || cell === undefined || cell === "") return "—";
  if (typeof cell === "boolean") return cell ? "Yes" : "No";
  if (typeof cell === "number") {
    return cell.toLocaleString("en", { maximumFractionDigits: 2 });
  }
  return cell;
}

function pivotRowsBySeries(rows: CardRow[], x: string, breakout: string, value: string) {
  const seriesNames = [...new Set(rows.map((row) => formatCell(row[breakout])))];
  const rowsByX = new Map<string, CardRow>();
  for (const row of rows) {
    const xValue = formatCell(row[x]);
    const pivotedRow = rowsByX.get(xValue) ?? { [x]: xValue };
    pivotedRow[formatCell(row[breakout])] = row[value] ?? null;
    rowsByX.set(xValue, pivotedRow);
  }
  return {
    chartRows: [...rowsByX.values()],
    chartSeries: seriesNames.map((name): ChartSeries => ({ key: name, label: name })),
  };
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

function ChartLegend({ series }: { series: DrawnSeries[] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-2 text-xs text-shamiri-text-dark-grey">
      {series.map(({ key, label, colorIndex, muted }) => (
        <li key={key} className="flex items-center gap-1.5">
          <svg aria-hidden="true" className="size-3" viewBox="0 0 12 12">
            <rect
              width="12"
              height="12"
              fill={seriesColor(colorIndex)}
              fillOpacity={muted ? MUTED_OPACITY : 1}
            />
          </svg>
          {label}
        </li>
      ))}
    </ul>
  );
}

function CartesianChart({
  rows,
  view,
  emphasis,
}: {
  rows: CardRow[];
  view: Extract<CardView, { kind: "bar" | "line" }>;
  emphasis: SupervisorEmphasis | undefined;
}) {
  const { chartRows, drawnSeries } = drawnChart(rows, view, emphasis);
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
      <YAxis tick={{ fontSize: 11 }} tickFormatter={formatValue}>
        {view.yLabel && (
          <Label value={view.yLabel} angle={-90} position="insideLeft" textAnchor="middle" />
        )}
      </YAxis>
      <Tooltip formatter={formatValue} />
      {drawnSeries.length > 1 && <Legend content={<ChartLegend series={drawnSeries} />} />}
      {view.goal !== undefined && (
        <ReferenceLine y={view.goal} stroke="var(--color-shamiri-red)" strokeDasharray="4 4" />
      )}
    </>
  );
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {view.kind === "bar" ? (
          <BarChart data={chartRows}>
            {axes}
            {drawnSeries.map(({ key, label, colorIndex, muted, stackId }) => (
              <Bar
                key={key}
                dataKey={(row: CardRow) => row[key]}
                name={label}
                fill={seriesColor(colorIndex)}
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
          <LineChart data={chartRows}>
            {axes}
            {drawnSeries.map(({ key, label, colorIndex, muted }) => (
              <Line
                key={key}
                dataKey={(row: CardRow) => row[key]}
                name={label}
                stroke={seriesColor(colorIndex)}
                strokeOpacity={muted ? MUTED_OPACITY : 1}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

function PieCard({ rows, name, value }: { rows: CardRow[]; name: string; value: string }) {
  const pieRows = rows.map((row, index) => ({
    name: formatCell(row[name]),
    value: Number(row[value] ?? 0),
    fill: seriesColor(index),
  }));
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={pieRows} dataKey="value" nameKey="name" label />
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TableCard({ rows, columns }: { rows: CardRow[]; columns: TableColumn[] }) {
  const tableColumns: ColumnDef<CardRow, CardCell>[] = columns.map(({ key, label }) => ({
    id: key,
    header: label,
    accessorFn: (row) => row[key] ?? null,
    cell: ({ getValue }) => formatCell(getValue()),
  }));
  return (
    <DataTable
      columns={tableColumns}
      data={rows}
      editColumns={false}
      emptyStateMessage="No data available"
    />
  );
}

function PivotCard({
  rows,
  row: rowKey,
  column: columnKey,
  value,
}: {
  rows: CardRow[];
  row: string;
  column: string;
  value: string;
}) {
  const { chartRows, chartSeries } = pivotRowsBySeries(rows, rowKey, columnKey, value);
  return (
    <TableCard
      rows={chartRows}
      columns={[
        { key: rowKey, label: rowKey },
        ...chartSeries.map(({ key, label }) => ({ key, label })),
      ]}
    />
  );
}

function ScopedFigures({
  hubRows,
  ownRows,
  renderFigure,
}: {
  hubRows: CardRow[];
  ownRows: CardRow[];
  renderFigure: (rows: CardRow[]) => ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-center text-sm font-semibold text-shamiri-new-blue">You</p>
        {ownRows.length > 0 ? (
          renderFigure(ownRows)
        ) : (
          <p className="py-10 text-center text-shamiri-text-grey">No data available</p>
        )}
      </div>
      <div>
        <p className="text-center text-sm font-semibold text-shamiri-text-dark-grey">Hub</p>
        {renderFigure(hubRows)}
      </div>
    </div>
  );
}

function ProgressFigure({ current, goal }: { current: number; goal: number }) {
  return (
    <div className="space-y-2 py-8">
      <p className="text-center text-2xl font-semibold">
        {formatCell(current)} / {formatCell(goal)}
      </p>
      <progress className="h-2 w-full accent-shamiri-new-blue" value={current} max={goal} />
    </div>
  );
}

export function MonitoringCardView({
  rows,
  view,
  emphasis,
}: {
  rows: CardRow[];
  view: CardView;
  emphasis?: SupervisorEmphasis;
}) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-shamiri-text-grey">No data available</p>;
  }
  const markedRows = emphasis
    ? rows.map((row) =>
        row.supervisorName === emphasis.ownSupervisorName
          ? { ...row, supervisorName: `${emphasis.ownSupervisorName}${YOU_SUFFIX}` }
          : row,
      )
    : rows;
  const renderScoped = (renderFigure: (figureRows: CardRow[]) => ReactNode) =>
    emphasis?.ownRows ? (
      <ScopedFigures hubRows={rows} ownRows={emphasis.ownRows} renderFigure={renderFigure} />
    ) : (
      renderFigure(rows)
    );
  switch (view.kind) {
    case "bar":
    case "line":
      return <CartesianChart rows={markedRows} view={view} emphasis={emphasis} />;
    case "pie":
      return renderScoped((pieRows) => (
        <PieCard rows={pieRows} name={view.name} value={view.value} />
      ));
    case "table":
      return <TableCard rows={markedRows} columns={view.columns} />;
    case "pivot":
      return <PivotCard rows={markedRows} row={view.row} column={view.column} value={view.value} />;
    case "scalar":
      return renderScoped((scalarRows) => (
        <p className="py-8 text-center text-4xl font-semibold">
          {formatCell(scalarRows[0]?.[view.value])}
        </p>
      ));
    case "progress":
      return renderScoped((progressRows) => (
        <ProgressFigure current={Number(progressRows[0]?.[view.value] ?? 0)} goal={view.goal} />
      ));
  }
}
