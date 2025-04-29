"use client";

import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/expenses/payout-history/actions";
import { HubFellowsAttendancesType } from "#/app/(platform)/ops/reporting/expenses/fellows/actions";
import { renderPayoutStatus } from "#/components/common/expenses/fellows/columns";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";
import Link from "next/link";

export const columns: ColumnDef<HubPayoutHistoryType>[] = [
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
    accessorKey: "dateAdded",
    header: "Date Added",
    cell: ({ row }) => {
      return format(row.original.dateAdded, "dd-MM-yyyy HH:mm:ss");
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
  },
  {
    accessorKey: "totalPayoutAmount",
    header: "Total Payout Amount (KES)",
  },
  {
    cell: ({ row }) => (
      <Link
        href={row.original.downloadLink}
        download
        className="text-shamiri-new-blue"
        target="_blank"
      >
        Download .csv
      </Link>
    ),
    header: "Action",
    id: "action",
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
    header: "MPESA Number",
    id: "MPESA Number",
    cell: ({ row }) => {
      return RenderParsedPhoneNumber(row.original.mpesaNo ?? undefined);
    },
  },
  {
    accessorKey: "schoolVenue",
    header: "School/Venue",
  },
  {
    accessorKey: "dateOfAttendance",
    header: "Date of attendance",
    cell: ({ row }) => {
      return row.original.dateOfAttendance
        ? format(row.original.dateOfAttendance, "dd-MM-yyyy")
        : null;
    },
  },
  {
    accessorKey: "dateMarked",
    header: "Date marked",
    cell: ({ row }) => {
      return format(row.original.dateMarked, "dd-MM-yyyy");
    },
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
    id: "status",
    header: "Status",
    accessorKey: "status",
    cell: ({ row }) => renderPayoutStatus(row.original.status),
  },
];
