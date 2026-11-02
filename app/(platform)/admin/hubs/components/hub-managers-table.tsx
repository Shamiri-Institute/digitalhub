"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Copy } from "lucide-react";

import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { toast } from "#/components/ui/use-toast";
import type { HubManager } from "../queries";

const columns: ColumnDef<HubManager>[] = [
  { accessorKey: "coordinatorName", header: "Name", id: "Name" },
  { accessorKey: "coordinatorEmail", header: "Email", id: "Email" },
  {
    accessorKey: "cellNumber",
    header: "Phone",
    id: "Phone",
    cell: ({ row }) => RenderParsedPhoneNumber(row.original.cellNumber ?? undefined),
  },
  {
    id: "Status",
    header: "Status",
    accessorFn: (manager) => (manager.archivedAt ? "Archived" : "Active"),
    cell: ({ row }) => {
      const { archivedAt } = row.original;
      return archivedAt ? (
        <span className="flex items-center gap-2">
          <Badge variant="outline-solid">Archived</Badge>
          <span className="text-sm text-shamiri-text-grey">{format(archivedAt, "d MMM yyyy")}</span>
        </span>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      );
    },
  },
  {
    id: "Added",
    header: "Added",
    accessorFn: (manager) => manager.createdAt,
    cell: ({ row }) => format(row.original.createdAt, "d MMM yyyy"),
  },
  {
    id: "button",
    cell: ({ row }) => <HubManagerMenu manager={row.original} />,
    enableHiding: false,
  },
];

function HubManagerMenu({ manager }: { manager: HubManager }) {
  const { coordinatorEmail: managerEmail } = manager;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${manager.coordinatorName}`}
          className="absolute inset-0 flex items-center justify-center border-l"
        >
          <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!managerEmail}
          onClick={() => {
            if (!managerEmail) return;
            void navigator.clipboard
              .writeText(managerEmail)
              .then(() => toast({ description: "Email copied" }));
          }}
        >
          <Copy className="mr-2 h-4 w-4" />
          Copy email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function HubManagersTable({
  managers,
  description,
}: {
  managers: HubManager[];
  description: string;
}) {
  return (
    <DataTable
      data={managers}
      columns={columns}
      className="data-table data-table-action bg-white"
      emptyStateMessage="No hub managers yet"
      getRowCanExpand={() => false}
      title="Hub managers"
      description={description}
      disableSearch
      disablePagination
      editColumns={false}
    />
  );
}
