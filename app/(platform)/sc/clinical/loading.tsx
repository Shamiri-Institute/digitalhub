"use client";

import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";

function CasesStatsSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col gap-2">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-200" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-200" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-200" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200" />
    </div>
  );
}

export default function ClinicalTableSkeleton() {
  const loadingColumns = [
    { header: "School", id: "school" },
    { header: "Pseudonym", id: "pseudonym" },
    { header: "Date Added", id: "dateAdded" },
    { header: "Case Status", id: "caseStatus" },
    { header: "Risk", id: "risk" },
    { header: "Age", id: "age" },
    { header: "Referral From", id: "referralFrom" },
  ].map((column) => ({
    header: column.header,
    id: column.id,
    cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
  }));

  function renderTableActions() {
    return (
      <Button variant="brand" disabled>
        New Case
      </Button>
    );
  }

  return (
    <div className="space-y-3 px-6 py-10">
      <CasesStatsSkeleton />
      <Separator />
      <DataTable
        key="skeleton-clinical-cases-table"
        columns={loadingColumns}
        data={Array.from(Array(10).keys()).map(() => ({}))}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
        renderTableActions={renderTableActions()}
      />
    </div>
  );
}
