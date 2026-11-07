import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import DataTable, { isActionColumn } from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export function DatatableSkeleton<TData>({
  columns,
  rows = 10,
  columnVisibilityState,
  renderTableActions,
}: {
  columns: ColumnDef<TData>[];
  rows?: number;
  columnVisibilityState?: VisibilityState;
  renderTableActions?: ReactNode;
}) {
  return (
    <DataTable
      columns={buildSkeletonColumns(columns)}
      data={buildSkeletonRows<TData>(rows)}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      columnVisibilityState={columnVisibilityState}
      renderTableActions={renderTableActions}
    />
  );
}

export function buildSkeletonColumns<TData>(columns: ColumnDef<TData>[]): ColumnDef<TData>[] {
  return columns.map((column) => {
    const id = (column.id ?? column.header) as string;
    const renderSkeleton = !isActionColumn(id);
    return {
      id,
      header: renderSkeleton ? id : "",
      cell: () =>
        renderSkeleton ? <Skeleton className="h-5 w-full bg-shamiri-light-grey" /> : null,
    };
  });
}

export function buildSkeletonRows<TData>(rows = 10): TData[] {
  return Array.from({ length: rows }, () => ({}) as TData);
}
