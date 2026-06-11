"use client";

import type { ImplementerRole } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import { columns, type SessionData } from "#/components/common/session/columns";
import DataTable from "#/components/data-table";

export default function SessionsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = buildSkeletonColumns(
    columns({
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
    }),
  );

  return (
    <DataTable
      columns={loadingColumns}
      data={buildSkeletonRows<SessionData>(5)}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
    />
  );
}
