"use client";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import React from "react";

export type SchoolFellowTableData = Prisma.FellowGetPayload<{
  include: {
    groups: true;
    supervisor: true;
    weeklyFellowRatings: true;
  };
}>;

function MenuItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <div className={cn("cursor-pointer px-3 py-2", className)}>{children}</div>
  );
}

export const columns: ColumnDef<SchoolFellowTableData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(val) => row.toggleSelected(!!val)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fellowName",
    header: "Name",
  },
  // TODO: add average rating column
  {
    // TODO: add correct display component
    cell: ({ row }) =>
      row.original.droppedOutAt || row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      ),
    header: "Active Status",
  },
  // TODO:: confirm if we are showing groups the fellow is handling in the school
  {
    accessorFn: (row) => row.groups.length,
    header: "No. of groups",
  },
  {
    header: "Phone Number",
    accessorKey: "phoneNumber",
  },
  {
    // TODO: add component for displaying this
    header: "Supervisor",
    accessorFn: (row) => row.supervisor?.supervisorName,
  },
  // TODO: confirm what will be showed for number of schools
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>View Fellow information</DropdownMenuItem>
          <DropdownMenuItem>Assign supervisor</DropdownMenuItem>
          <DropdownMenuItem>View students in group</DropdownMenuItem>
          <DropdownMenuItem>Session attendance history</DropdownMenuItem>
          <DropdownMenuItem>View student group evaluation</DropdownMenuItem>
          <DropdownMenuItem>View weekly fellow evaluation</DropdownMenuItem>
          <DropdownMenuItem>View complaints</DropdownMenuItem>
          <DropdownMenuItem>
            <div className="text-shamiri-red">Drop-out fellow</div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
