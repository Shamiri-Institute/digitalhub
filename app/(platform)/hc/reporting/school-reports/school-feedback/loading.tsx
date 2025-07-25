"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { columns } from "#/components/common/school-reports/school-feedback/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import { SchoolFeedbackType } from "#/app/(platform)/hc/reporting/school-reports/school-feedback/action";

export default function SchoolFeedbackTableSkeleton() {
  const loadingColumns: ColumnDef<SchoolFeedbackType>[] = columns.map((column) => {
    const columnId = typeof column.header === "string" ? column.header : (column.id ?? "unknown");
    return {
      accessorFn: () => null,
      header: columnId !== "checkbox" && columnId !== "button" ? columnId : "",
      id: columnId,
      cell: () => <Skeleton className="h-5 w-full bg-gray-200" />,
    };
  });

  const emptyData: SchoolFeedbackType[] = Array.from(Array(10).keys()).map(() => ({
    id: "",
    schoolName: "",
    studentTeacherSatisfaction: 0,
    supervisorRatings: [],
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
