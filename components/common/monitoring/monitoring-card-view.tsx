"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import {
  formatCell,
  pivotRowsBySeries,
  type SupervisorEmphasis,
  YOU_SUFFIX,
} from "#/components/common/monitoring/card-cells";
import { CartesianChart, PieCard } from "#/components/common/monitoring/monitoring-charts";
import DataTable from "#/components/data-table";
import type { CardCell, CardRow, CardView, TableColumn } from "#/lib/monitoring/types";

type CellRenderer = NonNullable<ColumnDef<CardRow, CardCell>["cell"]>;
const textCell: CellRenderer = ({ getValue }) => formatCell(getValue());
const numberCell: CellRenderer = ({ getValue }) => (
  <span className="block text-right tabular-nums">{formatCell(getValue())}</span>
);

function TableCard({ rows, columns }: { rows: CardRow[]; columns: TableColumn[] }) {
  const tableColumns: ColumnDef<CardRow, CardCell>[] = columns.map(({ key, label }) => {
    const columnIsNumeric = rows.some((row) => typeof row[key] === "number");
    return {
      id: key,
      header: label,
      accessorFn: (row) => row[key] ?? null,
      cell: columnIsNumeric ? numberCell : textCell,
      meta: columnIsNumeric ? { headerClassName: "text-right" } : undefined,
    };
  });
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
  rowLabel,
  column: columnKey,
  value,
}: {
  rows: CardRow[];
  row: string;
  rowLabel: string;
  column: string;
  value: string;
}) {
  const { chartRows, chartSeries } = pivotRowsBySeries(rows, rowKey, columnKey, value);
  return (
    <TableCard
      rows={chartRows}
      columns={[
        { key: rowKey, label: rowLabel },
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
  renderFigure: (rows: CardRow[], scope: string) => ReactNode;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="text-center text-sm font-semibold text-shamiri-new-blue">You</p>
        {ownRows.length > 0 ? (
          renderFigure(ownRows, "You")
        ) : (
          <p className="py-10 text-center text-shamiri-text-grey">No data available</p>
        )}
      </div>
      <div>
        <p className="text-center text-sm font-semibold text-shamiri-text-dark-grey">Hub</p>
        {renderFigure(hubRows, "Hub")}
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
  title,
  rows,
  view,
  emphasis,
}: {
  title: string;
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
  const renderScoped = (renderFigure: (figureRows: CardRow[], scope?: string) => ReactNode) =>
    emphasis?.ownRows ? (
      <ScopedFigures hubRows={rows} ownRows={emphasis.ownRows} renderFigure={renderFigure} />
    ) : (
      renderFigure(rows)
    );
  switch (view.kind) {
    case "bar":
    case "line":
      return <CartesianChart title={title} rows={markedRows} view={view} emphasis={emphasis} />;
    case "pie":
      return renderScoped((pieRows, scope) => (
        <PieCard
          title={scope ? `${title}: ${scope}` : title}
          rows={pieRows}
          name={view.name}
          value={view.value}
        />
      ));
    case "table":
      return <TableCard rows={markedRows} columns={view.columns} />;
    case "pivot":
      return (
        <PivotCard
          rows={markedRows}
          row={view.row}
          rowLabel={view.rowLabel}
          column={view.column}
          value={view.value}
        />
      );
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
