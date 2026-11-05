"use client";

import type { ColumnDef } from "@tanstack/react-table";
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

function seriesColor(index: number) {
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function formatCell(cell: CardCell | undefined, suffix = "") {
  if (cell === null || cell === undefined || cell === "") return "—";
  if (typeof cell === "boolean") return cell ? "Yes" : "No";
  if (typeof cell === "number") {
    return `${cell.toLocaleString("en", { maximumFractionDigits: 2 })}${suffix}`;
  }
  return `${cell}${suffix}`;
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

function CartesianChart({
  rows,
  view,
}: {
  rows: CardRow[];
  view: Extract<CardView, { kind: "bar" | "line" }>;
}) {
  const { chartRows, chartSeries } =
    "breakout" in view
      ? pivotRowsBySeries(rows, view.x, view.breakout, view.value)
      : { chartRows: rows, chartSeries: view.series };
  const axes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey={(row: CardRow) => formatCell(row[view.x])} tick={{ fontSize: 11 }}>
        {view.xLabel && <Label value={view.xLabel} position="insideBottom" offset={-4} />}
      </XAxis>
      <YAxis tick={{ fontSize: 11 }}>
        {view.yLabel && <Label value={view.yLabel} angle={-90} position="insideLeft" />}
      </YAxis>
      <Tooltip />
      {chartSeries.length > 1 && <Legend />}
    </>
  );
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {view.kind === "bar" ? (
          <BarChart data={chartRows}>
            {axes}
            {chartSeries.map(({ key, label }, index) => (
              <Bar
                key={key}
                dataKey={key}
                name={label}
                fill={seriesColor(index)}
                stackId={view.stacked ? "stack" : undefined}
                label={view.stacked ? undefined : { position: "top", fontSize: 11 }}
              />
            ))}
          </BarChart>
        ) : (
          <LineChart data={chartRows}>
            {axes}
            {chartSeries.map(({ key, label }, index) => (
              <Line key={key} dataKey={key} name={label} stroke={seriesColor(index)} />
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
  const tableColumns: ColumnDef<CardRow, CardCell>[] = columns.map(({ key, label, suffix }) => ({
    id: key,
    header: label,
    accessorFn: (row) => row[key] ?? null,
    cell: ({ getValue }) => formatCell(getValue(), suffix),
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

export function MonitoringCardView({ rows, view }: { rows: CardRow[]; view: CardView }) {
  if (rows.length === 0) {
    return <p className="py-10 text-center text-shamiri-text-grey">No data available</p>;
  }
  switch (view.kind) {
    case "bar":
    case "line":
      return <CartesianChart rows={rows} view={view} />;
    case "pie":
      return <PieCard rows={rows} name={view.name} value={view.value} />;
    case "table":
      return <TableCard rows={rows} columns={view.columns} />;
    case "pivot":
      return <PivotCard rows={rows} row={view.row} column={view.column} value={view.value} />;
    case "scalar":
      return (
        <p className="py-8 text-center text-4xl font-semibold">
          {formatCell(rows[0]?.[view.value])}
        </p>
      );
    case "progress": {
      const current = Number(rows[0]?.[view.value] ?? 0);
      return (
        <div className="space-y-2 py-8">
          <p className="text-center text-2xl font-semibold">
            {formatCell(current)} / {formatCell(view.goal)}
          </p>
          <progress className="h-2 w-full" value={current} max={view.goal} />
        </div>
      );
    }
  }
}
