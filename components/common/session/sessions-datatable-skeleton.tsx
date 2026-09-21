"use client";

import type { ImplementerRole } from "#/db/enums";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/session/columns";

export default function SessionsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <DatatableSkeleton
      rows={5}
      columns={columns({
        setSession: () => {},
        setRatingsDialog: () => {},
        setFellowAttendanceDialog: () => {},
        setSupervisorAttendanceDialog: () => {},
        setStudentAttendanceDialog: () => {},
        setSessionOccurrenceDialog: () => {},
        setRescheduleSessionDialog: () => {},
        setCancelSessionDialog: () => {},
        setAttendanceDocumentDialog: () => {},
        role,
      })}
    />
  );
}
