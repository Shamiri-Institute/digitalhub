"use client";

import type { ImplementerRole } from "@prisma/client";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/student/columns";

export default function StudentsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <DatatableSkeleton
      columns={columns({
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
      })}
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
