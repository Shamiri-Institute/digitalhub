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
    accessorKey: "totalPayoutAmount",
    header: "Total Payout Amount (KES)",
  },
  {
    cell: ({ row }) => (
      <a
        href={row.original.downloadLink}
        download
        className="text-shamiri-new-blue"
      >
        Download .csv
      </a>
    ),
    header: "Action",
    id: "action",
  },
];
