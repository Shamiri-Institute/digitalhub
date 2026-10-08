"use client";

import type { ImplementerRole } from "#/db/enums";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { fellowSchoolsColumns } from "#/components/common/fellow/fellow-schools-columns";

export default function FellowSchoolsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <DatatableSkeleton
      columns={fellowSchoolsColumns({
        state: {
          setFellow: () => null,
          setWeeklyEvaluationDialog: () => false,
          openEditDialog: () => null,
          setAttendanceHistoryDialog: () => false,
          setComplaintsDialog: () => false,
          role,
        },
      })}
      columnVisibilityState={{
        "Average Rating": false,
        "Active Status": false,
        County: false,
        "Fellow Email": false,
        "Phone Number": false,
        Gender: false,
        "Sub-county": false,
      }}
    />
  );
}
