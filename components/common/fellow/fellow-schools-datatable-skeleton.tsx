"use client";

import type { ImplementerRole } from "@prisma/client";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { fellowSchoolsColumns } from "#/components/common/fellow/fellow-schools-columns";

export default function FellowSchoolsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <DatatableSkeleton
      columns={fellowSchoolsColumns({
        state: {
          setFellow: () => null,
          setWeeklyEvaluationDialog: () => false,
          setEditFellowDialog: () => false,
          setAttendanceHistoryDialog: () => false,
          setComplaintsDialog: () => false,
          role,
        },
      })}
      columnVisibilityState={{
        "MPESA Name": false,
        "Average Rating": false,
        "Active Status": false,
        County: false,
        "Fellow Email": false,
        "Phone Number": false,
        "ID Number": false,
        "Date of Birth": false,
        Gender: false,
        "Sub-county": false,
      }}
    />
  );
}
