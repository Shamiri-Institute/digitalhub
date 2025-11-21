"use client";

import { columns, type SupervisorsData } from "#/components/common/supervisor/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import type { ImplementerRole } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";

export default function SupervisorsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = columns({
    setMarkAttendanceDialog: () => {},
    setSupervisor: () => {},
    role,
    sessions: [],
  })
    .map((column) => column.id ?? column.header)
    .map((column) => {
      const renderSkeleton = column !== "checkbox" && column !== "button";
      return {
        header: renderSkeleton ? column : "",
        id: column,
        cell: () => {
          return renderSkeleton ? <Skeleton className="h-5 w-full bg-gray-200" /> : null;
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
