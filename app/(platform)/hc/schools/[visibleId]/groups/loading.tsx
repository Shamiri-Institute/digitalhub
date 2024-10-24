"use client";

import { SchoolGroupDataTableData } from "#/app/(platform)/hc/schools/[visibleId]/groups/components/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import { ColumnDef } from "@tanstack/react-table";

export default function GroupsTableSkeleton() {
  // TODO: Get columns from original table columns
  let loadingColumns = [
    "checkbox",
    "Group",
    "Group Rating",
    "Supervisor",
    "Fellow",
    "No. of students",
    "button",
  ].map((column) => {
    const renderSkeleton = column !== "checkbox" && column !== "button";
    return {
      header: renderSkeleton ? column : "",
      id: column,
      cell: () => {
        return renderSkeleton ? (
          <Skeleton className="h-5 w-full bg-gray-200" />
        ) : null;
      },
    };
  });

  return (
    <DataTable
      columns={loadingColumns as ColumnDef<SchoolGroupDataTableData>[]}
      data={Array.from(Array(10).keys()).map(() => {
        return {
          id: "",
          groupName: "",
          leaderId: "",
          fellowName: "",
          supervisorId: "",
          supervisorName: "",
          schoolId: "",
          archivedAt: "",
          groupRating: null,
          studentCount: 0,
        };
      })}
      className="data-table data-table-action mt-4"
      emptyStateMessage=""
    />
  );
}
