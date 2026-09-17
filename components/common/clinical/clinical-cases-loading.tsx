"use client";

import type { ReactNode } from "react";
import ChartSkeleton from "#/components/charts/chart-skeleton";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";

export default function ClinicalTableSkeleton({ showNewCase }: { showNewCase?: boolean }) {
  function renderChartWidgets(num: number) {
    const out: ReactNode[] = [];
    for (let i = 0; i < num; i++) {
      out.push(<ChartSkeleton key={i} />);
    }

    return out;
  }

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
    if (!showNewCase) return;
    return (
      <Button variant="brand" disabled>
        New Case
      </Button>
    );
  }

  return (
    <div className="space-y-3 px-6">
      <div className="grid grid-cols-2 gap-5 py-5 md:grid-cols-4">{renderChartWidgets(4)}</div>
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
