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
import React from "react";

export type SchoolStudentTableData = Prisma.StudentGetPayload<{
  include: {
    clinicalCases: {
      include: {
        sessions: true;
      };
    };
    assignedGroup: true;
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

export const columns: ColumnDef<SchoolStudentTableData>[] = [
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
    accessorKey: "studentName",
    header: "Student Name",
  },
  {
    // TODO: this computation should be done during the fetch and possible user an accessor Function
    accessorKey: "assignedGroupId",
    header: "Group No.",
  },
  {
    accessorFn: (row) => (row.age || row.age === 0 ? `${row.age} yrs` : "N/A"),
    header: "Age",
  },
  {
    header: "Shamiri ID",
    accessorKey: "id",
  },
  {
    header: "Clinical Sessions",
    accessorFn: (row) =>
      row.clinicalCases?.reduce((acc, val) => acc + val.sessions.length, 0),
  },
  {
    header: "Gender",
    accessorKey: "gender",
  },
  {
    header: "Contact No.",
    accessorKey: "phoneNumber",
  },
  {
    header: "Admission Number",
    accessorKey: "admissionNumber",
  },
  {
    header: "Stream",
    accessorKey: "stream",
  },
  {
    header: "Class/Form",
    accessorKey: "form",
  },
  {
    header: "Date added",
    accessorFn: (row) => format(row.createdAt, "dd/MM/yyyy"),
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
          <DropdownMenuItem>Edit Information</DropdownMenuItem>
          <DropdownMenuItem>Mark Student Attendance</DropdownMenuItem>
          <DropdownMenuItem>View group transfer history</DropdownMenuItem>
          <DropdownMenuItem>View attendance history</DropdownMenuItem>
          <DropdownMenuItem>Add clinical case</DropdownMenuItem>
          <DropdownMenuItem>Reporting notes</DropdownMenuItem>
          <DropdownMenuItem>
            <div className="text-shamiri-red">Drop-out student</div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
