"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { HubReportComplaintsType } from "#/app/(platform)/hc/reporting/expenses/complaints/actions";
import { columns } from "#/components/common/expenses/complaints/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function ComplaintsTableSkeleton() {
  const loadingColumns: ColumnDef<HubReportComplaintsType>[] = columns.map((column) => {
    const columnId = typeof column.header === "string" ? column.header : (column.id ?? "unknown");
    return {
      accessorFn: () => null,
      header:
        columnId !== "checkbox" && columnId !== "button" && columnId !== "expand" ? columnId : "",
      id: columnId,
      cell: () => {
        return columnId !== "checkbox" && columnId !== "button" && columnId !== "expand" ? (
          <Skeleton className="h-5 w-full bg-gray-200" />
        ) : null;
      },
    };
  });

  const emptyData: HubReportComplaintsType[] = Array.from(Array(10).keys()).map(() => ({
    fellowId: "",
    fellowName: "",
    mpesaName: "",
    mpesaNumber: "",
    hub: "",
    supervisorName: "",
    specialSession: 0,
    noOfSpecialSessions: 0,
    noOfTrainingSessions: 0,
    noOfSupervisionSessions: 0,
    noOfPreSessions: 0,
    noOfMainSessions: 0,
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
