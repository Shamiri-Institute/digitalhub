"use client";

import type { ImplementerRole } from "@prisma/client";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import DataTable from "#/components/data-table";
import { columns, type HubsWithSchools } from "./columns";

export default function HubsDataTable({
  hubs,
  role,
}: {
  hubs: HubsWithSchools[];
  role: ImplementerRole;
}) {
  return (
    <div className="space-y-3 px-6 py-10">
      <DataTable
        data={hubs}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No hubs found"
        renderSubComponent={({ row }) => {
          return (
            <SchoolsDatatable
              schools={row.original.schools}
              role={role}
              disablePagination={true}
              isSubComponent={true}
              className="lg:mt-0"
              columnVisibilityState={{
                County: false,
                "Date added": false,
                "Expected number of students": false,
                Type: false,
              }}
            />
          );
        }}
      />
    </div>
  );
}
