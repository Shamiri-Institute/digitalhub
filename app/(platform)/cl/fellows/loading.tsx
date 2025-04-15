"use client";

import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function ClinicalTableSkeleton() {
  const loadingColumns = [
    { header: "Name", id: "fellowName" },
    { header: "Average Rating", id: "averageRating" },
    { header: "Active Status", id: "activeStatus" },
    { header: "Cases Referred", id: "casesReferred" },
    { header: "No. of Groups", id: "noOfGroups" },
    { header: "Phone Number", id: "phoneNumber" },
    { header: "Supervisor", id: "supervisorName" },
  ].map((column) => ({
    header: column.header,
    id: column.id,
    cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-clinical-cases-table"
        columns={loadingColumns}
        data={Array.from(Array(10).keys()).map(() => ({}))}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
