"use client";

import { ImplementerRole, type School } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import { columns, type SchoolGroupDataTableData } from "#/components/common/group/columns";
import CreateGroup from "#/components/common/group/create-group";
import DataTable from "#/components/data-table";

export default function GroupsDatatableSkeleton({
  role,
  rows = 10,
}: {
  role: ImplementerRole;
  rows?: number;
}) {
  const loadingColumns = buildSkeletonColumns(
    columns({
      setGroup: () => {},
      setStudentsDialog: () => {},
      setEvaluationDialog: () => {},
      setLeaderDialog: () => {},
      setArchiveDialog: () => {},
      setUnarchiveDialog: () => {},
      role,
    }),
  );

  const renderTableActions = () => {
    return role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.SUPERVISOR ? (
      <CreateGroup
        supervisors={[]}
        school={
          {
            schoolName: "",
          } as School
        }
        groupCount={0}
        disabled={true}
      />
    ) : null;
  };

  return (
    <DataTable
      columns={loadingColumns}
      data={buildSkeletonRows<SchoolGroupDataTableData>(rows)}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      renderTableActions={renderTableActions()}
      columnVisibilityState={{ "Active Status": false }}
    />
  );
}
