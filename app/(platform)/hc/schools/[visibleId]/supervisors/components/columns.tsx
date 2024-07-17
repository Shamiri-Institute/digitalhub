"use client";

import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { cn } from "#/lib/utils";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
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
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
        aria-label="Select all"
        className={
          "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
        }
      />
    ),
    cell: ({ row }) => {
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="Select row"
            className={
              "h-5 w-5 border-shamiri-light-grey bg-white data-[state=checked]:bg-shamiri-new-blue"
            }
          />
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "supervisorName",
    header: "Name",
    id: "Name",
  },
  {
    header: "Active",
    cell: ({ row }) =>
      row.original.archivedAt || row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      ),
  },
  {
    header: "No. of fellows",
    cell: ({ row }) => {
      const activeFellows = row.original.fellows.filter(
        (fellow) => !fellow.droppedOut,
      );
      return activeFellows.length + "/" + row.original.fellows.length;
    },
  },
  {
    header: "Phone Number",
    accessorFn: (row) => row.cellNumber,
  },
  {
    header: "Gender",
    id: "Gender",
    accessorKey: "gender",
  },
  {
    header: "Assigned School",
    cell: ({ row }) => {
      const schools = row.original.assignedSchools;

      if (schools.length === 0) {
        return null;
      }

      if (schools.length > 1) {
        return (
          <div className="relative flex items-center">
            <span>{schools[0]?.schoolName},</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <span className="ml-2 cursor-pointer select-none text-shamiri-new-blue">
                  +{schools?.length - 1}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent>
                  <div className="flex flex-col gap-y-2 px-2 py-1 text-sm">
                    {schools.slice(1).map((school, index) => {
                      return (
                        <span key={index.toString()}>{school.schoolName}</span>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenuPortal>
            </DropdownMenu>
          </div>
        );
      }
      return <span>{schools[0]?.schoolName}</span>;
    },
  },
  {
    id: "button",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="absolute inset-0 border-l bg-white">
            <div className="flex h-full w-full items-center justify-center">
              <Icons.moreHorizontal className="h-5 w-5 text-shamiri-text-grey" />
            </div>
          </div>
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
    enableHiding: false,
  },
];
