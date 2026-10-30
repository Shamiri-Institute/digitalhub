"use client";

import type { ImplementerRole } from "#/db/enums";
import { DatatableSkeleton } from "#/components/common/build-skeleton-columns";
import { columns } from "#/components/common/schools/columns";

export default function SchoolsDatatableSkeleton({ role }: { role: ImplementerRole }) {
  return (
    <DatatableSkeleton
      columns={columns({
        role,
        state: { openDialog: () => {} },
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
