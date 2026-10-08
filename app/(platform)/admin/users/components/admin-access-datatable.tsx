"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import DataTable from "#/components/data-table";
import { Button } from "#/components/ui/button";
import type { ImplementerAdmin } from "../queries";
import AdminAccessDialog from "./admin-access-dialog";
import { columns } from "./columns";

export default function AdminAccessDataTable({ admins }: { admins: ImplementerAdmin[] }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3 py-10">
      <DataTable
        data={admins}
        columns={columns}
        className="data-table data-table-action bg-white lg:mt-4"
        emptyStateMessage="No users found"
        getRowCanExpand={() => false}
        renderTableActions={
          <Button variant="brand" className="flex gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            Add new user
          </Button>
        }
      />
      <AdminAccessDialog open={showAdd} onOpenChange={setShowAdd} />
    </div>
  );
}
