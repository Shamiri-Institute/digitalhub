"use client";

import type { ImplementerRole } from "@prisma/client";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/supervisor/columns";

export default function SupervisorsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <DatatableSkeleton
      columns={columns({
        setMarkAttendanceDialog: () => {},
        setSupervisor: () => {},
        role,
        sessions: [],
      })}
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
