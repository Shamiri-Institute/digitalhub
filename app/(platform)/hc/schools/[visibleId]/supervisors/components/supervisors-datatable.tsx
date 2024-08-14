"use client";

import DataTable from "#/app/(platform)/hc/components/data-table";
import { columns } from "#/app/(platform)/hc/schools/[visibleId]/supervisors/components/columns";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { Prisma } from "@prisma/client";
import { useContext } from "react";

export default function SupervisorsDataTable({
  supervisors,
}: {
  supervisors: Prisma.SupervisorGetPayload<{
    include: {
      assignedSchools: true;
      fellows: true;
    };
  }>[];
}) {
  const context = useContext(SchoolInfoContext);
  return (
    <DataTable
      data={supervisors}
      columns={columns}
      className={"data-table data-table-action mt-4"}
      emptyStateMessage="No supervisors found for this hub"
      columnVisibilityState={{
        Gender: false,
        checkbox: !context.school?.droppedOut ?? null,
        button: !context.school?.droppedOut ?? null,
      }}
    />
  );
}
