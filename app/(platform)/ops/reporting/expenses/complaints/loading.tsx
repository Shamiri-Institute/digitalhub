"use client";

import type { OpsHubsReportComplaintsType } from "#/app/(platform)/ops/reporting/expenses/complaints/actions";
import { columns } from "#/components/common/expenses/complaints/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";

export default function ComplaintsTableSkeleton() {
  const loadingColumns: ColumnDef<OpsHubsReportComplaintsType>[] = columns.map((column) => {
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

  const emptyData: OpsHubsReportComplaintsType[] = Array.from(Array(10).keys()).map(() => ({
    fellowName: "",
    hub: "",
    supervisorName: "",
    specialSession: 0,
    preVsMain: "",
    trainingSupervision: "",
    paidAmount: 0,
    totalAmount: 0,
    complaints: [],
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
