"use client";

import { ImplementerRole } from "#/db/enums";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/group/columns";
import CreateGroup from "#/components/common/group/create-group";
import type { school } from "#/db/schema";

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
          } as typeof school.$inferSelect
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
