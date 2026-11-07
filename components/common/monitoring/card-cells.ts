import { sessionLabel } from "#/components/charts/constants";
import type { CardCell, CardRow, ChartSeries } from "#/lib/monitoring/types";

export const YOU_SUFFIX = " (You)";

export type SupervisorEmphasis = { ownSupervisorName: string; ownRows?: CardRow[] };

export function formatCell(cell: CardCell | undefined) {
  if (cell === null || cell === undefined || cell === "") return "—";
  if (typeof cell === "boolean") return cell ? "Yes" : "No";
  if (typeof cell === "number") {
    return cell.toLocaleString("en", { maximumFractionDigits: 2 });
  }
  return sessionLabel(cell);
}

export function pivotRowsBySeries(rows: CardRow[], x: string, breakout: string, value: string) {
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
