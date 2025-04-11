"use client";

import { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import FellowExpenseTableDropdownMe from "#/components/common/expenses/fellows/fellow-expense-table-dropdown-me";
import { Badge } from "#/components/ui/badge";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";

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
    cell: ({ row }) => {
      if (row.original.dateOfAttendance) {
        return format(row.original.dateOfAttendance, "dd-MM-yyyy");
      }
      return null;
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
    cell: ({ row }) => renderStatus(row.original.status),
  },

  {
    id: "button",
    cell: ({ row }) => <FellowExpenseTableDropdownMe expense={row.original} />,
    enableHiding: false,
  },
];

function renderStatus(status: string) {
  if (status === "inititiated") {
    return <Badge variant="shamiri-green">Payment Initiated</Badge>;
  }
  if (status === "deducted") {
    return <Badge variant="destructive">Payment Deducted</Badge>;
  }
  return <Badge variant="default">Pending Payment</Badge>;
}
