"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import type { HubReportComplaintsType } from "#/app/(platform)/hc/reporting/expenses/complaints/actions";
import FellowComplaintsActionsDropdown from "#/components/common/expenses/complaints/complaints-actions-dropdown";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";

export const columns: ColumnDef<HubReportComplaintsType>[] = [
  {
    id: "button",
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
    accessorKey: "fellowName",
    header: "Fellow name",
  },
  {
    accessorKey: "supervisorName",
    header: "Supervisor name",
  },
  {
    accessorKey: "specialSession",
    header: "Special sessions",
  },
  {
    accessorKey: "preVsMain",
    header: "Pre vs main Sessions",
  },
  {
    accessorKey: "trainingSupervision",
    header: "Training vs supervision",
  },
  {
    accessorKey: "paidAmount",
    header: "Paid amount (KES)",
  },
  {
    accessorKey: "totalAmount",
    header: "Total amount (KES)",
  },
];

export const subColumns: ColumnDef<HubReportComplaintsType["complaints"][number]>[] = [
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
    accessorKey: "dateOfComplaint",
    header: "Date of complaint",
  },
  {
    accessorKey: "reasonForComplaint",
    header: "Reason for complaint",
  },
  {
    cell: ({ row }) => (
      <a href={row.original.statement} download className="text-shamiri-new-blue">
        Download
      </a>
    ),
    header: "Statement",
    id: "Statement",
  },
  {
    accessorKey: "difference",
    header: "Difference (KES)",
  },
  {
    accessorKey: "confirmedAmountReceived",
    header: "Confirmed amount received (KES)",
  },
  {
    cell: ({ row }) => renderStatus(row.original.status),
    header: "Status",
    id: "Status",
  },
  {
    id: "button",
    cell: ({ row }) => <FellowComplaintsActionsDropdown complaint={row.original} />,
    enableHiding: false,
  },
];

function renderStatus(status: string) {
  if (status === "REJECTED") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  if (status === "APPROVED") {
    return <Badge variant="shamiri-green">Accepted</Badge>;
  }
  return <Badge variant="default">Pending</Badge>;
}
