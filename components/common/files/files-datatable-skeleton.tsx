"use client";

import type { ImplementerRole } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import { fileColumns, type SchoolFilesTableData } from "#/components/common/files/columns";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";

export default function FilesDatatableSkeleton({ role: _role }: { role: ImplementerRole }) {
  const loadingColumns = buildSkeletonColumns(
    fileColumns({
      setRenameDialog: () => {},
      setFile: () => {},
      setDeleteDialog: () => {},
    }),
  );

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
      columns={loadingColumns}
      data={buildSkeletonRows<SchoolFilesTableData>()}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      renderTableActions={renderTableActions()}
    />
  );
}
