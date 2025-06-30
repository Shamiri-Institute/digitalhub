"use client";

import type { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import { columns } from "#/components/common/expenses/fellows/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";

export default function FellowsTableSkeleton() {
  const loadingColumns: ColumnDef<HubPayoutHistoryType>[] = columns.map(
    (column) => {
      const columnId =
        typeof column.header === "string"
          ? column.header
          : (column.id ?? "unknown");
      return {
        accessorFn: () => null,
        header:
          columnId !== "checkbox" && columnId !== "button" ? columnId : "",
        id: columnId,
        cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
      };
    },
  );

  const emptyData: HubPayoutHistoryType[] = Array.from(Array(10).keys()).map(
    () => ({
      dateAdded: new Date(),
      duration: "",
      totalPayoutAmount: 0,
      fellowDetails: [],
    }),
  );

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-fellows-table"
        columns={loadingColumns}
        data={emptyData}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
