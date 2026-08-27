"use client";

import { ImplementerRole, type School } from "@prisma/client";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/group/columns";
import CreateGroup from "#/components/common/group/create-group";

export default function GroupsDatatableSkeleton({
  role,
  rows = 10,
}: {
  role: ImplementerRole;
  rows?: number;
}) {
  const renderTableActions =
    role === ImplementerRole.HUB_COORDINATOR || role === ImplementerRole.SUPERVISOR ? (
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

  return (
    <DatatableSkeleton
      rows={rows}
      columns={columns({
        setGroup: () => {},
        setStudentsDialog: () => {},
        setEvaluationDialog: () => {},
        setLeaderDialog: () => {},
        setArchiveDialog: () => {},
        setUnarchiveDialog: () => {},
        role,
      })}
      columnVisibilityState={{ "Active Status": false }}
      renderTableActions={renderTableActions}
    />
  );
}
