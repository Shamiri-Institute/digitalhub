import type { ColumnDef, VisibilityState } from "@tanstack/react-table";
import type { ReactNode } from "react";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

/**
 * Loading-state table shared by every entity's datatable skeleton: takes the
 * entity's real columns and renders a DataTable of skeleton cells.
 */
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
    const renderSkeleton = id !== "checkbox" && id !== "button";
    return {
      id,
      header: renderSkeleton ? id : "",
      cell: () => (renderSkeleton ? <Skeleton className="h-5 w-full bg-gray-200" /> : null),
    } as ColumnDef<TData>;
  });
}

export function buildSkeletonRows<TData>(rows = 10): TData[] {
  return Array.from({ length: rows }, () => ({}) as TData);
}
