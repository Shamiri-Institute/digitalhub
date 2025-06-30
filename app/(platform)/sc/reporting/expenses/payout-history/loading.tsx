"use client";

import type { SupervisorPayoutHistoryType } from "#/app/(platform)/sc/reporting/expenses/payout-history/actions";
import { columns } from "#/components/common/expenses/payout-history/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";

export default function PayoutHistoryTableSkeleton() {
  const loadingColumns: ColumnDef<SupervisorPayoutHistoryType>[] = columns.map((column) => {
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

  const emptyData: SupervisorPayoutHistoryType[] = Array.from(Array(10).keys()).map(() => ({
    id: "",
    dateAdded: new Date(),
    duration: "",
    totalPayoutAmount: 0,
    fellowDetails: [],
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-payout-history-table"
        columns={loadingColumns}
        data={emptyData}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
