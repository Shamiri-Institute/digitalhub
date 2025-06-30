"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import { opsColumns } from "#/app/(platform)/ops/reporting/expenses/payout-history/ops-columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function PayoutHistoryTableSkeleton() {
  const loadingColumns: ColumnDef<OpsHubsPayoutHistoryType>[] = opsColumns.map((column) => {
    const columnId = typeof column.header === "string" ? column.header : (column.id ?? "unknown");
    return {
      accessorFn: () => null,
      header: columnId !== "checkbox" && columnId !== "button" ? columnId : "",
      id: columnId,
      cell: () => {
        return columnId !== "checkbox" && columnId !== "button" ? (
          <Skeleton className="h-5 w-full bg-gray-200" />
        ) : null;
      },
    };
  });

  const emptyData: OpsHubsPayoutHistoryType[] = Array.from(Array(10).keys()).map(() => ({
    dateAdded: new Date(),
    duration: "",
    totalPayoutAmount: 0,
    fellowDetails: [],
    confirmedAt: null,
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-complaints-table"
        columns={loadingColumns}
        data={emptyData}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
