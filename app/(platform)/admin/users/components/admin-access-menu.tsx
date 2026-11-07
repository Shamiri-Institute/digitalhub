"use client";

import { useState } from "react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "#/components/ui/dropdown-menu";
import type { ImplementerAdmin } from "../queries";
import AdminAccessDialog from "./admin-access-dialog";
import { RowActionsTrigger } from "#/components/common/row-actions-menu";

export default function AdminAccessMenu({ admin }: { admin: ImplementerAdmin }) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <DropdownMenu>
        <RowActionsTrigger label={`Actions for ${admin.adminName}`} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowEdit(true)}>Manage access</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminAccessDialog open={showEdit} onOpenChange={setShowEdit} admin={admin} />
    </>
  );
}
