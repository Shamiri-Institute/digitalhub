"use client";

import { ImplementerRole } from "@prisma/client";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/fellow/columns";

export default function FellowsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <DatatableSkeleton
      columns={columns({
        state: {
          setFellow: () => {},
          setDetailsDialog: () => {},
          setReplaceDialog: () => {},
          setStudentsDialog: () => {},
          setAttendanceHistoryDialog: () => {},
          setAssignSupervisorDialog: () => {},
        },
        role,
      })}
      columnVisibilityState={{
        checkbox: role === ImplementerRole.HUB_COORDINATOR,
        Supervisor: false,
      }}
    />
  );
}
