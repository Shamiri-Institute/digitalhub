"use client";

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

export type SupervisorsData = Prisma.SupervisorGetPayload<{
  include: {
    assignedSchools: true;
    fellows: true;
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

export const columns: ColumnDef<SupervisorsData>[] = [
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
    accessorKey: "supervisorName",
    header: "Name",
  },
  // TODO: show active/total e.g. 19/20
  {
    accessorFn: (row) => row.fellows.length,
    header: "Number of fellows",
  },
  {
    header: "Gender",
    accessorKey: "gender",
  },
  {
    header: "Assigned School",
    accessorFn: (row) => row.assignedSchools[0]?.schoolName,
  },
  {
    header: "Phone Number",
    accessorFn: (row) => row.cellNumber,
  },
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
          <DropdownMenuItem>Edit Supervisor Information</DropdownMenuItem>
          <DropdownMenuItem>Mark Attendance</DropdownMenuItem>
          <DropdownMenuItem>Monthly supervisor evaluation</DropdownMenuItem>
          <DropdownMenuItem>Submit complaint</DropdownMenuItem>
          <DropdownMenuItem>Overall supervisor evaluation</DropdownMenuItem>
          <DropdownMenuItem>
            <div className="text-shamiri-red">Drop-out supervisor</div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
