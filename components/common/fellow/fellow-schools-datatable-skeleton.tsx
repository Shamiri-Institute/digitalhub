"use client";

import type { ImplementerRole } from "@prisma/client";
import type { FellowsData } from "#/app/(platform)/sc/actions";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import { fellowSchoolsColumns } from "#/components/common/fellow/fellow-schools-columns";
import DataTable from "#/components/data-table";

export default function FellowSchoolsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = buildSkeletonColumns(
    fellowSchoolsColumns({
      state: {
        setFellow: () => null,
        setWeeklyEvaluationDialog: () => false,
        setEditFellowDialog: () => false,
        setAttendanceHistoryDialog: () => false,
        setComplaintsDialog: () => false,
        role,
      },
    }),
  );

  return (
    <DataTable
      columns={loadingColumns}
      data={buildSkeletonRows<FellowsData>()}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      columnVisibilityState={{
        "MPESA Name": false,
        "Average Rating": false,
        "Active Status": false,
        County: false,
        "Fellow Email": false,
        "Phone Number": false,
        "ID Number": false,
        "Date of Birth": false,
        Gender: false,
        "Sub-county": false,
      }}
    />
  );
}
