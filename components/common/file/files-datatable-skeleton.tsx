"use client";

import type { ImplementerRole } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { fileColumns, type SchoolFilesTableData } from "#/components/common/files/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function FilesDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = fileColumns({
    setRenameDialog: () => {},
    setFile: () => {},
    setDeleteDialog: () => {},
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
      columns={loadingColumns as ColumnDef<SchoolFilesTableData>[]}
      data={Array.from({ length: 10 }).map(() => ({})) as SchoolFilesTableData[]}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      columnVisibilityState={{}}
    />
  );
}
