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
import format from "date-fns/format";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import React from "react";
import { DropoutSchool } from "../../components/dropout-school-form";

export type SchoolsTableData = Prisma.SchoolGetPayload<{
  include: {
    assignedSupervisor: true;
  };
}>;

function MenuItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("cursor-pointer px-3 py-2", className)}>{children}</div>
  );
}

export const columns: ColumnDef<SchoolsTableData>[] = [
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
    accessorKey: "schoolName",
    header: "School Name",
  },
  /**
   * TODO: uncomment this once we support the subcounty column in the SDH database
   * {
   *    accessorKey: 'schoolSubCounty',
   *    header: 'Sub - County'
   *  },
   */
  {
    // TODO: this computation should be done during the fetch and possible user an accessor Function
    accessorKey: "numbersExpected",
    header: "Students",
  },
  {
    accessorFn: (row) => row.assignedSupervisor?.supervisorName,
    header: "Point Supervisor",
  },
  // TODO: find a way to find the upcoming session
  /*
  {
    header: 'Upcoming Session',
    accessorKey: 
  },
  */
  /*
  {
    header: "Report submission FIXME",
    accessorKey: "schoolName",
  },
  */
  {
    header: "School ID",
    accessorKey: "id",
  },
  {
    header: "County",
    accessorKey: "schoolCounty",
  },
  {
    header: "Point Teacher",
    accessorKey: "pointPersonName",
  },
  {
    header: "Point Teacher Phone Number",
    accessorKey: "pointPersonPhone",
  },
  {
    header: "Point Supervisor Phone Number",
    accessorFn: (row) => row.assignedSupervisor?.cellNumber,
  },
  {
    header: "Point Supervisor Email",
    accessorFn: (row) => row.assignedSupervisor?.supervisorEmail,
  },
  {
    header: "Date added",
    // TODO: need to date fns to format this
    accessorFn: (row) => format(row.createdAt, "dd/MM/yyyy"),
  },
  {
    header: "Type",
    accessorKey: "schoolType",
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
          <DropdownMenuItem>
            <Link href={`/hc/schools/${row.original.visibleId}`}>
              View school
            </Link>
          </DropdownMenuItem>
          <MenuItem>
            Edit school information
          </MenuItem>
          <DropdownMenuItem>Assign point supervisor</DropdownMenuItem>
          {!row.original.droppedOut || !row.original.droppedOutAt ? (
            <MenuItem className="text-shamiri-red">
              <DropoutSchool
                schoolId={row.original.id}
                schoolName={row.original.schoolName}
              >
                <div>Dropout school</div>
              </DropoutSchool>
            </MenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
