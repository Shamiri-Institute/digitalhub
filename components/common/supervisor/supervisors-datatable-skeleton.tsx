"use client";

import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/supervisor/columns";

export default function SupervisorsDatatableSkeleton() {
  return (
    <DatatableSkeleton
      columns={columns({
        setMarkAttendanceDialog: () => {},
        setSupervisor: () => {},
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
