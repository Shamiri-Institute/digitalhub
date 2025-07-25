"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { columns } from "#/components/common/fellow-reports/weekly-fellow-evaluation/columns";
import type { WeeklyFellowEvaluation } from "#/components/common/fellow-reports/weekly-fellow-evaluation/types";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function WeeklyFellowEvaluationTableSkeleton() {
  const loadingColumns: ColumnDef<WeeklyFellowEvaluation>[] = columns.map((column) => {
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

  const emptyData: WeeklyFellowEvaluation[] = Array.from(Array(10).keys()).map(() => ({
    id: "",
    fellowName: "",
    hub: "",
    supervisorName: "",
    avgBehaviour: 0,
    avgProgramDelivery: 0,
    avgDressingGrooming: 0,
    week: [],
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
