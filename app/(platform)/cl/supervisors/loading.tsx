"use client";

import DataTable from "#/components/data-table";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";

export default function SupervisorTableSkeleton() {
  const loadingColumns = [
    { header: "Supervisor Name", id: "supervisorName" },
    { header: "Active Status", id: "activeStatus" },
    { header: "No. of Clinical Cases", id: "noOfClinicalCases" },
    { header: "No. of Treatment Plans", id: "noOfTreatmentPlans" },
    { header: "No. of Case Notes", id: "noOfCaseNotes" },
  ].map((column) => ({
    header: column.header,
    id: column.id,
    cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <h1 className="text-2xl font-bold">Supervisors</h1>
      <Separator />
      <DataTable
        columns={loadingColumns}
        data={Array.from(Array(10).keys()).map(() => ({}))}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
