"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";
import type { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import PayoutActionsDropdown from "#/components/common/expenses/payout-history/payout-actions-dropdown";
import type { PayoutHistoryEntry } from "#/lib/actions/expenses/payout-history";
import { sortBy } from "#/lib/table-view";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { DISPLAY_DATE_TIME } from "#/lib/date-utils";

export const columns: ColumnDef<PayoutHistoryEntry>[] = [
  {
    id: "expand",
    cell: ({ row }) => {
      return (
        <button
          type="button"
          aria-label={row.getIsExpanded() ? "Hide details" : "Show details"}
          aria-expanded={row.getIsExpanded()}
          onClick={row.getToggleExpandedHandler()}
          className="cursor-pointer px-4 py-2"
        >
          {row.getIsExpanded() ? (
            <Image unoptimized priority src={ArrowUpIcon} alt="" width={16} height={16} />
          ) : (
            <Image unoptimized priority src={ArrowDownIcon} alt="" width={16} height={16} />
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
      return format(row.original.dateAdded, `${DISPLAY_DATE_TIME}:ss`);
    },
  },
  {
    accessorKey: "duration",
    header: "Duration",
    // A payout period starts on the day it was added.
    sortingFn: sortBy((payout) => payout.dateAdded),
  },
  {
    accessorKey: "totalPayoutAmount",
    header: "Total Payout Amount (KES)",
    meta: { numeric: true },
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
    meta: { numeric: true },
  },
];
