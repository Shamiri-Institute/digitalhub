"use client";

import { columns, type SessionData } from "#/components/common/session/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";
import type { ImplementerRole } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";

export default function SessionsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = columns({
    setSession: () => {},
    setRatingsDialog: () => {},
    setFellowAttendanceDialog: () => {},
    setSupervisorAttendanceDialog: () => {},
    setStudentAttendanceDialog: () => {},
    setSessionOccurrenceDialog: () => {},
    setRescheduleSessionDialog: () => {},
    setCancelSessionDialog: () => {},
    role,
  })
    .map((column) => column.id ?? column.header)
    .map((column) => {
      const renderSkeleton = column !== "checkbox" && column !== "button";
      return {
        header: renderSkeleton ? column : "",
        id: column,
        cell: () => {
          return renderSkeleton ? <Skeleton className="h-5 w-full bg-gray-200" /> : null;
        },
      };
    });

  return (
    <DataTable
      columns={loadingColumns as ColumnDef<SessionData>[]}
      data={
        Array.from(Array(10).keys()).map(() => {
          return {};
        }) as SessionData[]
      }
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
    />
  );
}
