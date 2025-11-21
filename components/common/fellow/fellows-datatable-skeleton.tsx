"use client";

import { ImplementerRole } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { columns, type SchoolFellowTableData } from "#/components/common/fellow/columns";
import { BatchUploadDownloadFellow } from "#/components/common/fellow/upload-csv";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function FellowsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = columns({
    state: {
      setFellow: () => {},
      setDetailsDialog: () => {},
      setReplaceDialog: () => {},
      setStudentsDialog: () => {},
      setAttendanceHistoryDialog: () => {},
      setAssignSupervisorDialog: () => {},
    },
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

  const renderTableActions = () => {
    return <BatchUploadDownloadFellow disabled={true} role={role} />;
  };

  return (
    <DataTable
      columns={loadingColumns as ColumnDef<SchoolFellowTableData>[]}
      data={
        Array.from(Array(10).keys()).map(() => {
          return {};
        }) as SchoolFellowTableData[]
      }
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      renderTableActions={renderTableActions()}
      columnVisibilityState={{
        checkbox: role === ImplementerRole.HUB_COORDINATOR,
        Supervisor: false,
      }}
    />
  );
}
