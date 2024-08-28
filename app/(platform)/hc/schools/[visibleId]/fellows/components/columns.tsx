"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import AssignFellowSupervisor from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/assign-fellow-supervisor";
import { FellowsDatatableMenu } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/fellows-datatable";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { Prisma } from "@prisma/client";
import { ColumnDef } from "@tanstack/react-table";
import { parsePhoneNumber } from "libphonenumber-js";

export type SchoolFellowTableData = {
  id: string;
  fellowName: string;
  cellNumber: string;
  supervisorId: string;
  supervisorName: string;
  droppedOut: boolean | null;
  groupName: string;
  averageRating: number | null;
};

export const columns = (
  supervisors: Prisma.SupervisorGetPayload<{}>[],
): ColumnDef<SchoolFellowTableData>[] => {
  return [
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
      accessorKey: "fellowName",
      header: "Name",
    },
    {
      header: "Average Rating",
      cell: ({ row }) => {
        const rating = row.original.averageRating ?? 0;
        return <DataTableRatingStars rating={rating} />;
      },
      id: "Average Rating",
    },
    {
      cell: ({ row }) =>
        row.original.droppedOut ? (
          <Badge variant="destructive">Inactive</Badge>
        ) : (
          <Badge variant="shamiri-green">Active</Badge>
        ),
      header: "Active Status",
    },
    {
      accessorKey: "groupName",
      header: "Group Name",
    },
    {
      header: "Phone Number",
      accessorFn: (row) => {
        return (
          row.cellNumber &&
          parsePhoneNumber(row.cellNumber, "KE").formatNational()
        );
      },
    },
    {
      header: "Supervisor",
      cell: ({ row }) => (
        <div className="flex">
          <AssignFellowSupervisor
            fellowId={row.original.id}
            supervisorId={row.original.supervisorId}
            supervisors={supervisors}
          />
        </div>
      ),
    },
    // TODO: confirm what will be showed for number of schools
    {
      id: "button",
      cell: ({ row }) => <FellowsDatatableMenu fellow={row.original} />,
      enableHiding: false,
    },
  ];
};
