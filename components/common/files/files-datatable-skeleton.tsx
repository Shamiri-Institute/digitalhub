"use client";

import { fileColumns, type SchoolFilesTableData } from "#/components/common/files/columns";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import type { ImplementerRole } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";

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

  const renderTableActions = () => {
    return (
      <Button disabled={true} className="gap-1">
        <Icons.plusCircle className="h-4 w-4" />
        <span>Upload file</span>
      </Button>
    );
  };

  return (
    <DataTable
      columns={loadingColumns as ColumnDef<SchoolFilesTableData>[]}
      data={
        Array.from(Array(10).keys()).map(() => {
          return {};
        }) as SchoolFilesTableData[]
      }
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      renderTableActions={renderTableActions()}
    />
  );
}
