"use client";

import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function SupervisorsTableSkeleton() {
  const loadingColumns = [
    { header: "Date Created", id: "dateCreated" },
    { header: "Date of Expense", id: "dateOfExpense" },
    { header: "Supervisor Name", id: "supervisorName" },
    { header: "Type of Expense", id: "typeOfExpense" },
    { header: "Session", id: "session" },
    { header: "Destination", id: "destination" },
    { header: "Amount", id: "amount" },
    { header: "Status", id: "status" },
  ].map((column) => ({
    header: column.header,
    id: column.id,
    cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-supervisors-table"
        columns={loadingColumns}
        data={Array.from(Array(10).keys()).map(() => ({}))}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
