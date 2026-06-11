"use client";

import type { ImplementerRole } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import { fileColumns, type SchoolFilesTableData } from "#/components/common/files/columns";
import DataTable from "#/components/data-table";

export default function FilesDatatableSkeleton({ role: _role }: { role: ImplementerRole }) {
  const loadingColumns = buildSkeletonColumns(
    fileColumns({
      setRenameDialog: () => {},
      setFile: () => {},
      setDeleteDialog: () => {},
    }),
  );

  return (
    <DataTable
      columns={loadingColumns}
      data={buildSkeletonRows<SchoolFilesTableData>()}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      columnVisibilityState={{}}
    />
  );
}
