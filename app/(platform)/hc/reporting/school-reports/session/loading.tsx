"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { SessionReportType } from "#/app/(platform)/hc/reporting/school-reports/session/actions";
import { columns } from "#/components/common/school-reports/session/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function SessionReportTableSkeleton() {
  const loadingColumns: ColumnDef<SessionReportType>[] = columns.map((column) => {
    const columnId = typeof column.header === "string" ? column.header : (column.id ?? "unknown");
    return {
      accessorFn: () => null,
      header: columnId !== "checkbox" && columnId !== "button" ? columnId : "",
      id: columnId,
      cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
    };
  });

  const emptyData: SessionReportType[] = Array.from(Array(10).keys()).map(() => ({
    id: "",
    dateAdded: new Date(),
    avgStudentBehaviour: 0,
    avgAdminSupport: 0,
    avgWorkload: 0,
    session: [],
    schoolName: "",
  }));

  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        key="skeleton-payout-history-table"
        columns={loadingColumns}
        data={emptyData}
        className="data-table data-table-action lg:mt-4"
        emptyStateMessage=""
      />
    </div>
  );
}
