"use client";

import { AllSupervisorsDataTableMenu } from "#/app/(platform)/hc/supervisors/components/main-supervisors-datatable";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { parsePhoneNumber } from "libphonenumber-js";

export type SupervisorsData = Prisma.SupervisorGetPayload<{
  include: {
    assignedSchools: true;
    fellows: true;
  };
}>;

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
    header: "Assigned school",
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
    header: "Status",
    cell: ({ row }) =>
      row.original.archivedAt || row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      ),
  },
  {
    header: "No. of fellows",
    id: "No. of fellows",
    cell: ({ row }) => {
      const activeFellows = row.original.fellows.filter(
        (fellow) => !fellow.droppedOut,
      );
      return activeFellows.length + "/" + row.original.fellows.length;
    },
  },
  {
    header: "Phone Number",
    id: "Phone number",
    accessorFn: (row) => {
      return (
        row.cellNumber &&
        parsePhoneNumber(row.cellNumber, "KE").formatNational()
      );
    },
  },
  {
    header: "Gender",
    id: "Gender",
    accessorKey: "gender",
  },
  {
    header: "County",
    id: "county",
    accessorKey: "county",
  },
  {
    header: "Sub-county",
    id: "subCounty",
    accessorKey: "subCounty",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <AllSupervisorsDataTableMenu supervisor={row.original} />
    ),
    enableHiding: false,
  },
];
