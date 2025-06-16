"use client";

import { columns, SupervisorsData } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import { ImplementerRole } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";

export default function SupervisorsDatatableSkeleton({
  role,
}: {
  role: ImplementerRole;
}) {
  const loadingColumns = columns({
    setMarkAttendanceDialog: () => {},
    sessions: [],
  })
    .map((column) => column.id ?? column.header)
    .map((column) => {
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
      columns={loadingColumns as ColumnDef<SupervisorsData>[]}
      data={
        Array.from(Array(10).keys()).map(() => {
          return {};
        }) as SupervisorsData[]
      }
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      columnVisibilityState={{
        Gender: false,
        "Phone number": false,
        Status: false,
        checkbox: false,
        button: false,
      }}
    />
  );
} 