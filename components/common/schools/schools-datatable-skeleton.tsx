"use client";

import type { ImplementerRole } from "#/db/enums";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/schools/columns";

export default function SchoolsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <DatatableSkeleton
      columns={columns({
        role,
        state: {
          editDialog: false,
          setEditDialog: () => null,
          pointSupervisorDialog: false,
          setPointSupervisorDialog: () => null,
          schoolDropOutDialog: false,
          setSchoolDropOutDialog: () => null,
          undoDropOutDialog: false,
          setUndoDropOutDialog: () => null,
          school: null,
          setSchool: () => null,
        },
      })}
      columnVisibilityState={{
        "School ID": false,
        "Sub - county": false,
        "Point teacher": false,
        "Point teacher phone no.": false,
        "Point teacher email": false,
        "Point supervisor phone no.": false,
        "Point supervisor email": false,
      }}
    />
  );
}
