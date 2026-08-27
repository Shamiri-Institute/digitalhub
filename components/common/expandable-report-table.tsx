"use client";

import type { ColumnDef } from "@tanstack/react-table";
import DataTable from "#/components/data-table";
import { cn } from "#/lib/utils";

/**
 * Shared shell for the report tables: an outer DataTable whose rows expand
 * into a sub-DataTable of detail rows. Each report supplies its columns,
 * the accessor for a row's detail rows, and the two empty messages.
 */
export default function ExpandableReportTable<TData, TSub>({
  data,
  columns,
  subColumns,
  getSubRows,
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
