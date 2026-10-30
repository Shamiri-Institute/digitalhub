"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import type { AdminHub } from "../queries";
import { columns } from "./columns";
import HubDialog from "./hub-dialog";

export default function HubsDataTable({
  hubs,
  canManageHubs,
}: {
  hubs: AdminHub[];
  canManageHubs: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3">
      <DataTable
        data={hubs}
        columns={columns}
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
      />
      {canManageHubs && <HubDialog open={showAdd} onOpenChange={setShowAdd} />}
    </div>
  );
}
