"use client";

import DataTableRatingStars from "#/app/(platform)/hc/components/datatable-rating-stars";
import { FellowsDatatableMenu } from "#/app/(platform)/hc/schools/[visibleId]/fellows/components/fellows-datatable";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import { parsePhoneNumber } from "libphonenumber-js";
import { Dispatch, SetStateAction } from "react";

export type SchoolFellowTableData = {
  id: string;
  fellowName: string;
  cellNumber: string;
  supervisorId: string;
  supervisorName: string;
  droppedOut: boolean | null;
  groupId: string;
  groupName: string;
  averageRating: number | null;
};

export const columns = (state: {
  setFellow: Dispatch<SetStateAction<SchoolFellowTableData | undefined>>;
}): ColumnDef<SchoolFellowTableData>[] => {
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
      id: "Name",
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
      id: "Active Status",
    },
    {
      accessorKey: "groupName",
      header: "Group Name",
      id: "Group Name",
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
      id: "button",
      cell: ({ row }) => (
        <FellowsDatatableMenu fellow={row.original} state={state} />
      ),
      enableHiding: false,
    },
  ];
};
