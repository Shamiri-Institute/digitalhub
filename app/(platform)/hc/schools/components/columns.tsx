"use client";

import SchoolTableDropdown from "#/app/(platform)/hc/schools/components/school-table-dropdown";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type SchoolsTableData = Prisma.SchoolGetPayload<{
  include: {
    assignedSupervisor: true;
    interventionSessions: true;
  };
}>;

export const columns: ColumnDef<SchoolsTableData>[] = [
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
    accessorKey: "schoolName",
    header: "School name",
    id: "School name",
  },
  {
    header: "School ID",
    id: "School ID",
    accessorKey: "visibleId",
  },
  // TODO: computed school ranking
  // {
  //   accessorKey: "schoolRating",
  //   header: "School rating",
  // },
  {
    accessorKey: "schoolCounty",
    header: "County",
    id: "County",
  },
  {
    accessorKey: "schoolSubCounty",
    header: "Sub - county",
    id: "Sub - county",
  },
  // {
  //   // TODO: fetch and display clinical cases
  //   accessorKey: "clinicalCases",
  //   header: "Clinical cases",
  // },
  {
    header: "Point teacher",
    accessorKey: "pointPersonName",
    id: "Point teacher",
  },
  {
    header: "Point teacher phone no.",
    id: "Point teacher phone no.",
    accessorKey: "pointPersonPhone",
  },
  {
    // TODO: this computation should be done during the fetch and possible user an accessor Function
    accessorKey: "numbersExpected",
    header: "No. of students",
    id: "No. of students",
  },
  {
    accessorFn: (row) => row.assignedSupervisor?.supervisorName,
    header: "Point supervisor",
    id: "Point supervisor",
  },
  {
    header: "Point supervisor phone no.",
    id: "Point supervisor phone no.",
    accessorFn: (row) => row.assignedSupervisor?.cellNumber,
  },
  {
    header: "Point supervisor email",
    id: "Point supervisor email",
    accessorFn: (row) => row.assignedSupervisor?.supervisorEmail,
  },
  // TODO: find a way to find the upcoming session
  /*
  {
    header: 'Upcoming Session',
    accessorKey: 
  },
  */
  // {
  //   // TODO: Get report submission status
  //   header: "Report submission",
  //   accessorKey: "schoolName",
  // },
  {
    header: "Date added",
    id: "Date added",
    accessorFn: (row) => format(row.createdAt, "dd/MM/yyyy"),
  },
  {
    header: "Type",
    id: "Type",
    accessorKey: "schoolType",
  },
  {
    header: "Active status",
    cell: ({ row }) =>
      row.original.archivedAt || row.original.droppedOut ? (
        <Badge variant="destructive">Inactive</Badge>
      ) : (
        <Badge variant="shamiri-green">Active</Badge>
      ),
  },
  {
    id: "button",
    cell: ({ row }) => <SchoolTableDropdown schoolRow={row.original} />,
    enableHiding: false,
  },
];
