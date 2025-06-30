"use client";

import type { ImplementerRole } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { columns, type SchoolStudentTableData } from "#/components/common/student/columns";
import DataTable from "#/components/data-table";
import { Skeleton } from "#/components/ui/skeleton";

export default function StudentsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = columns({
    setEditDialog: () => {},
    setStudent: () => {},
    setAttendanceHistoryDialog: () => {},
    setMarkAttendanceDialog: () => {},
    setReportingNotesDialog: () => {},
    setGroupTransferHistory: () => {},
    setDropoutDialog: () => {},
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
      columns={loadingColumns as ColumnDef<SchoolStudentTableData>[]}
      data={
        Array.from(Array(10).keys()).map(() => {
          return {};
        }) as SchoolStudentTableData[]
      }
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      columnVisibilityState={{
        Gender: false,
        "Contact no.": false,
        "Admission number": false,
        Stream: false,
        "Class/Form": false,
        "Date added": false,
      }}
    />
  );
}
