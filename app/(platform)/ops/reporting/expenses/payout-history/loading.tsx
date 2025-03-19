"use client";

import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function PayoutHistoryTableSkeleton() {
  const loadingColumns = [
    { header: "Date Created", id: "dateCreated" },
    { header: "Duration", id: "duration" },
    { header: "Total Payout Amount(KES)", id: "totalPayoutAmount" },
    { header: "Action", id: "action" },
  ].map((column) => ({
    header: column.header,
    id: column.id,
    cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-payout-history-table"
        columns={loadingColumns}
        data={Array.from(Array(10).keys()).map(() => ({}))}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
