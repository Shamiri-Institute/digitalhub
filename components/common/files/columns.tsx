"use client";

import SchoolFilesDataTableMenu from "#/components/common/files/files-datatable-menu";
import { Checkbox } from "#/components/ui/checkbox";
import type { Prisma } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import type { Dispatch, SetStateAction } from "react";

export type SchoolFilesTableData = Prisma.SchoolDocumentsGetPayload<{}>;

export const fileColumns = (state: {
  setRenameDialog: Dispatch<SetStateAction<boolean>>;
  setDeleteDialog: Dispatch<SetStateAction<boolean>>;
  setFile: Dispatch<SetStateAction<SchoolFilesTableData | null>>;
}): ColumnDef<SchoolFilesTableData>[] => [
  {
    id: "checkbox",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")
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
    accessorKey: "createdAt",
    header: "Date Added",
    id: "Date Added",
  },
  {
    accessorKey: "fileName",
    header: "Name",
    id: "Name",
  },
  {
    accessorKey: "type",
    header: "Type",
    id: "Type",
  },
  {
    id: "button",
    cell: ({ row }) => <SchoolFilesDataTableMenu file={row.original} state={state} />,
    enableHiding: false,
  },
];
