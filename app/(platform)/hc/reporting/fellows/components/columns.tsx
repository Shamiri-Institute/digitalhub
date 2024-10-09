"use client";

import { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/fellows/actions";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import HCFellowsExpenseDropdownMenu from "./fellow-expense-table-dropdown-me";

export const columns: ColumnDef<HubFellowsAttendancesType>[] = [
  {
    id: "button",
    cell: ({ row }) => {
      return (
        <button
          onClick={row.getToggleExpandedHandler()}
          className="cursor-pointer px-4 py-2"
        >
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
    header: "Fellow Name",
  },
  {
    accessorKey: "hub",
    header: "Hub",
  },
  {
    accessorKey: "supervisorName",
    header: "Supervisor Name",
  },
  {
    accessorKey: "specialSession",
    header: "Special Session",
  },
  {
    accessorKey: "preVsMain",
    header: "Pre vs Main sessions",
  },
  {
    accessorKey: "trainingSupervision",
    header: "Training vs Supervision",
  },
  {
    accessorKey: "paidAmount",
    header: "Paid Amount (KES)",
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount (KES)",
  },
];

export const subColumns: ColumnDef<
  HubFellowsAttendancesType["attendances"][number]
>[] = [
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
    accessorKey: "session",
    header: "Session",
  },
  {
    accessorKey: "mpesaNo",
    header: "Mpesa no.",
  },
  {
    accessorKey: "schoolVenue",
    header: "School/Venue",
  },
  {
    accessorKey: "dateOfAttendance",
    header: "Date of attendance",
  },
  {
    accessorKey: "dateMarked",
    header: "Date marked",
  },
  {
    accessorKey: "group",
    header: "Group",
  },
  {
    accessorKey: "amount",
    header: "Amount (KES)",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    id: "button",
    cell: ({ row }) => <HCFellowsExpenseDropdownMenu expense={row.original} />,
    enableHiding: false,
  },
];
