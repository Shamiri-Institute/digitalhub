"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";
import type { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import PayoutActionsDropdown from "#/components/common/expenses/payout-history/payout-actions-dropdown";
import type { PayoutHistoryEntry } from "#/lib/actions/expenses/payout-history";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";

export const columns: ColumnDef<PayoutHistoryEntry>[] = [
  {
    id: "expand",
    cell: ({ row }) => {
      return (
        <button
          type="button"
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
    id: "button",
    cell: ({ row }) => <PayoutActionsDropdown payout={row.original} />,
    enableHiding: false,
  },
];

export const subColumns: ColumnDef<OpsHubsPayoutHistoryType["fellowDetails"][number]>[] = [
  {
    accessorKey: "fellowName",
    header: "Fellow Name",
  },
  {
    accessorKey: "fellowMpesaName",
    header: "Fellow Mpesa Name",
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
    accessorKey: "mpesaNumber",
    header: "Mpesa Number",
  },
  {
    accessorKey: "totalAmount",
    header: "Total Amount (KES)",
  },
];
