"use client";

import { useState } from "react";

import { Icons } from "#/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import type { ImplementerAdmin } from "../queries";
import AdminAccessDialog from "./admin-access-dialog";

export default function AdminAccessMenu({ admin }: { admin: ImplementerAdmin }) {
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="absolute inset-0 border-l">
            <div className="flex h-full w-full items-center justify-center">
              <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowEdit(true)}>Manage access</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AdminAccessDialog open={showEdit} onOpenChange={setShowEdit} admin={admin} />
    </>
  );
}
