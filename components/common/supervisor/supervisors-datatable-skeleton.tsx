"use client";

import type { ImplementerRole } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import { columns, type SupervisorsData } from "#/components/common/supervisor/columns";
import DataTable from "#/components/data-table";

export default function SupervisorsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = buildSkeletonColumns(
    columns({
      setMarkAttendanceDialog: () => {},
      setSupervisor: () => {},
      role,
      sessions: [],
    }),
  );

  return (
    <DataTable
      columns={loadingColumns}
      data={buildSkeletonRows<SupervisorsData>()}
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
