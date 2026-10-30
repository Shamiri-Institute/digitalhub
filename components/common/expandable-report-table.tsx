"use client";

import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "#/components/data-table";
import { cn } from "#/lib/utils";

export default function ExpandableReportTable<TData, TSub>({
  data,
  columns,
  subColumns,
  getSubRows,
  getRowId,
  emptyStateMessage,
  subEmptyStateMessage,
  container = true,
  subDisableSearch = true,
  subDisablePagination = true,
}: {
  data: TData[];
  columns: ColumnDef<TData>[];
  subColumns: ColumnDef<TSub>[];
  getSubRows: (row: TData) => TSub[] | undefined;
  getRowId: (row: TData) => string;
  emptyStateMessage: string;
  subEmptyStateMessage: string;
  container?: boolean;
  subDisableSearch?: boolean;
  subDisablePagination?: boolean;
}) {
  return (
    <div className={cn(container && "container w-full grow space-y-3")}>
      <DataTable
        data={data}
        columns={columns}
        getRowId={getRowId}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage={emptyStateMessage}
        renderSubComponent={({ row }) => (
          <DataTable
            data={getSubRows(row.original) ?? []}
            editColumns={false}
            columns={subColumns}
            className="data-table data-table-action border-0 bg-white"
            emptyStateMessage={subEmptyStateMessage}
            disableSearch={subDisableSearch}
            disablePagination={subDisablePagination}
          />
        )}
      />
    </div>
  );
}
