"use client";

import { HubPayoutHistoryType } from "#/app/(platform)/hc/reporting/payout-history/actions";
import { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<HubPayoutHistoryType>[] = [
  {
    accessorKey: "dateAdded",
    header: "Date Added",
  },
  {
    accessorKey: "duration",
    header: "Duration",
  },
  {
    accessorKey: "totalpayoutAmount",
    header: "Total Payout Amount (KES)",
  },
  {
    accessorKey: "action",
    header: "Action",
  },
];
