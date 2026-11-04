"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ImplementerPayoutHistoryType } from "#/app/(platform)/admin/reporting/expenses/payout-history/actions";
import { payoutRunColumns } from "#/app/(platform)/admin/reporting/expenses/payout-history/payout-run-columns";
import DataTable from "#/components/data-table";
import { SkeletonCell } from "#/components/ui/skeleton";

export default function PayoutHistoryTableSkeleton() {
  const loadingColumns: ColumnDef<ImplementerPayoutHistoryType>[] = payoutRunColumns.map(
    (column) => {
      const columnId = typeof column.header === "string" ? column.header : (column.id ?? "unknown");
      return {
        accessorFn: () => null,
        header: columnId !== "checkbox" && columnId !== "button" ? columnId : "",
        id: columnId,
        cell: columnId !== "checkbox" && columnId !== "button" ? SkeletonCell : undefined,
      };
    },
  );

  const emptyData: ImplementerPayoutHistoryType[] = Array.from(Array(10).keys()).map(() => ({
    id: "",
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
