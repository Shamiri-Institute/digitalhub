"use client";

import type { FellowComplaintsType } from "#/components/common/fellow-reports/complaints/actions";
import FellowComplaintsDropdownMenu from "#/components/common/fellow-reports/complaints/complaints-dropdown-actions";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

export const columns: ColumnDef<FellowComplaintsType>[] = [
  {
    id: "button",
    cell: ({ row }) => {
      return (
        <button onClick={row.getToggleExpandedHandler()} className="cursor-pointer px-4 py-2">
          {row.getIsExpanded() ? (
            <Image
              unoptimized
              priority
              src={ArrowUpIcon}
              alt="Arrow Up Icon"
              width={16}
              height={16}
            />
          ) : (
            <Image
              unoptimized
              priority
              src={ArrowDownIcon}
              alt="Arrow Down Icon"
              width={16}
              height={16}
            />
          )}
        </button>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "fellowName",
    header: "Fellow name",
  },
  {
    accessorKey: "supervisorName",
    header: "Supervisor name",
  },
];

export const subColumns: ColumnDef<FellowComplaintsType["complaints"][number]>[] = [
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
    accessorKey: "date",
    header: "Date",
  },
  {
    accessorKey: "complaint",
    header: "Complaint",
  },
  {
    accessorKey: "additionalComments",
    header: "Additional Comments",
  },
  {
    id: "button",
    cell: ({ row }) => <FellowComplaintsDropdownMenu fellowComplaints={row.original} />,
    enableHiding: false,
  },
];
