"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import type { ImplementerRole } from "#/db/enums";
import SchoolsDatatable from "#/components/common/schools/schools-datatable";
import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import { getColumns, type HubsWithSchools } from "./columns";
import HubDialog from "./hub-dialog";

export default function HubsDataTable({
  hubs,
  role,
  canManageHubs,
}: {
  hubs: HubsWithSchools[];
  role: ImplementerRole;
  canManageHubs: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3">
      <DataTable
        data={hubs}
        columns={getColumns(canManageHubs)}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No hubs found"
        renderTableActions={
          canManageHubs ? (
            <Button variant="brand" className="flex gap-2" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4" />
              Add hub
            </Button>
          ) : undefined
        }
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
      {canManageHubs && <HubDialog open={showAdd} onOpenChange={setShowAdd} />}
    </div>
  );
}
