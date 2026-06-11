"use client";

import type { ImplementerRole } from "@prisma/client";
import {
  buildSkeletonColumns,
  buildSkeletonRows,
} from "#/components/common/build-skeleton-columns";
import { columns, type SchoolStudentTableData } from "#/components/common/student/columns";
import DataTable from "#/components/data-table";

export default function StudentsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  const loadingColumns = buildSkeletonColumns(
    columns({
      setEditDialog: () => {},
      setStudent: () => {},
      setAttendanceHistoryDialog: () => {},
      setMarkAttendanceDialog: () => {},
      setReportingNotesDialog: () => {},
      setGroupTransferHistory: () => {},
      setMoveSchoolDialog: () => {},
      setDropoutDialog: () => {},
      setArchiveDialog: () => {},
      role,
      sessions: [],
    }),
  );

  return (
    <DataTable
      columns={loadingColumns}
      data={buildSkeletonRows<SchoolStudentTableData>()}
      className="data-table data-table-action lg:mt-4"
      emptyStateMessage=""
      columnVisibilityState={{
        Gender: false,
        "Contact no.": false,
        "Shamiri ID": false,
        "Admission number": false,
        Stream: false,
        "Grade/Form": false,
        "Date added": false,
        Age: false,
        "Clinical Sessions": false,
        checkbox: false,
      }}
    />
  );
}
