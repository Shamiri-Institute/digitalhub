"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Archive, Copy, RotateCcw, UserPlus } from "lucide-react";
import { useState } from "react";

import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import DataTable from "#/components/data-table";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { toast, toastOnError } from "#/components/ui/use-toast";
import { restoreHubManager } from "#/lib/actions/admin/hub-managers";
import type { HubManager } from "../queries";
import { AddHubManagerDialog, ArchiveHubManagerDialog } from "./hub-manager-dialogs";

type HubScope = { hubId: string; hubName: string; canManage: boolean };

function hubManagerColumns(scope: HubScope): ColumnDef<HubManager>[] {
  return [
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
            <span className="text-sm text-shamiri-text-grey">
              {format(archivedAt, "d MMM yyyy")}
            </span>
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
      cell: ({ row }) => <HubManagerMenu manager={row.original} scope={scope} />,
      enableHiding: false,
    },
  ];
}

function HubManagerMenu({ manager, scope }: { manager: HubManager; scope: HubScope }) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { coordinatorEmail: managerEmail } = manager;

  const restore = async () => {
    setIsRestoring(true);
    const response = await restoreHubManager({
      hubId: scope.hubId,
      hubManagerId: manager.id,
    }).finally(() => setIsRestoring(false));
    toast({
      variant: response.success ? undefined : "destructive",
      description: response.message,
    });
  };

  return (
    <>
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
          {scope.canManage && <DropdownMenuSeparator />}
          {scope.canManage && manager.archivedAt && (
            <DropdownMenuItem onClick={toastOnError(restore)} disabled={isRestoring}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore {manager.coordinatorName}
            </DropdownMenuItem>
          )}
          {scope.canManage && !manager.archivedAt && (
            <DropdownMenuItem
              className="text-shamiri-light-red"
              onClick={() => setArchiveOpen(true)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive hub manager
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {scope.canManage && (
        <ArchiveHubManagerDialog
          open={archiveOpen}
          onOpenChange={setArchiveOpen}
          manager={manager}
          hubId={scope.hubId}
          hubName={scope.hubName}
        />
      )}
    </>
  );
}

export default function HubManagersTable({
  managers,
  ...scope
}: HubScope & { managers: HubManager[] }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <>
      <DataTable
        data={managers}
        columns={hubManagerColumns(scope)}
        className="data-table data-table-action bg-white"
        emptyStateMessage="No hub managers yet"
        getRowCanExpand={() => false}
        title="Hub managers"
        description={`Each signs in to the ${scope.hubName} hub dashboard with the same access. Archiving removes only their hub access; any other role they hold keeps working.`}
        disableSearch
        disablePagination
        editColumns={false}
        renderTableActions={
          scope.canManage && (
            <Button variant="brand" className="flex gap-2" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add hub manager
            </Button>
          )
        }
      />
      {scope.canManage && (
        <AddHubManagerDialog open={addOpen} onOpenChange={setAddOpen} hubId={scope.hubId} />
      )}
    </>
  );
}
