"use client";

import { fileColumns, SchoolFilesTableData } from "#/components/common/files/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import { ImplementerRole } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";

interface FileTableData {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
}

export default function FilesDatatableSkeleton({
  role,
}: {
  role: ImplementerRole;
}) {
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
          return renderSkeleton ? (
            <Skeleton className="h-5 w-full bg-gray-200" />
          ) : null;
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
