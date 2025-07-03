"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";
import type { OpsHubsPayoutHistoryType } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";

export const columns: ColumnDef<OpsHubsPayoutHistoryType>[] = [
  {
    id: "button",
    cell: ({ row }) => {
      return (
        <button type="button" onClick={row.getToggleExpandedHandler()} className="cursor-pointer px-4 py-2">
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
    cell: ({ row }) => {
      const downloadCSV = () => {
        const fellowDetails = row.original.fellowDetails;
        const headers = [
          "Fellow Name",
          "Hub",
          "Supervisor Name",
          "MPESA Number",
          "Mpesa Name",
          "Amount",
        ];
        const csvContent = [
          headers.join(","),
          ...fellowDetails.map((fellow) =>
            [
              `"${fellow.fellowName}"`,
              `"${fellow.hub}"`,
              `"${fellow.supervisorName}"`,
              `"${RenderParsedPhoneNumber(fellow.mpesaNumber)}"`,
              `"${fellow.fellowMpesaName}"`,
              fellow.totalAmount,
            ].join(","),
          ),
        ].join("\n");

        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute(
          "download",
          `payout_${row.original.dateAdded.toISOString().split("T")[0]}.csv`,
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      return (
        <button type="button" onClick={downloadCSV} className="text-shamiri-new-blue hover:underline">
          Download .csv
        </button>
      );
    },
    header: "Action",
    id: "action",
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
