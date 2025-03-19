"use client";

import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function ComplaintsTableSkeleton() {
  const loadingColumns = [
    { header: "Fellow Name", id: "fellowName" },
    { header: "Supervisor Name", id: "supervisorName" },
    { header: "Special Session", id: "specialSession" },
    { header: "Pre Vs Main", id: "preVsMain" },
    { header: "Training Supervision", id: "trainingSupervision" },
    { header: "Paid Amount", id: "paidAmount" },
    { header: "Total Amount", id: "totalAmount" },
  ].map((column) => ({
    header: column.header,
    id: column.id,
    cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-complaints-table"
        columns={loadingColumns}
        data={Array.from(Array(10).keys()).map(() => ({}))}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
