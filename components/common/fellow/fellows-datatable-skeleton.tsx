"use client";

import { ImplementerRole } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import { columns, type SchoolFellowTableData } from "#/components/common/fellow/columns";
import DataTable from "#/components/data-table";

export default function FellowsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = buildSkeletonColumns(
    columns({
      state: {
        setFellow: () => {},
        setDetailsDialog: () => {},
        setReplaceDialog: () => {},
        setStudentsDialog: () => {},
        setAttendanceHistoryDialog: () => {},
        setAssignSupervisorDialog: () => {},
      },
      role,
    }),
  );

  return (
    <DataTable
      columns={loadingColumns}
      data={buildSkeletonRows<SchoolFellowTableData>()}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      columnVisibilityState={{
        checkbox: role === ImplementerRole.HUB_COORDINATOR,
        Supervisor: false,
      }}
    />
  );
}
