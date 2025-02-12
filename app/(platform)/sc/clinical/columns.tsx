"use client";

import { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import { ClinicalCases } from "#/app/(platform)/sc/clinical/action";
import FellowExpenseTableDropdownMe from "#/components/common/expenses/fellows/fellow-expense-table-dropdown-me";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import { cn } from "#/lib/utils";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";

export const columns: ColumnDef<ClinicalCases>[] = [
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
    accessorKey: "school",
    header: "School",
  },
  {
    accessorKey: "pseudonym",
    header: "Pseudonym",
  },
  {
    accessorKey: "dateAdded",
    header: "Date added",
  },
  {
    accessorKey: "caseStatus",
    header: "Case Status",
    cell: ({ row }) => renderRiskOrCaseStatus(row.original.caseStatus),
  },
  {
    accessorKey: "risk",
    header: "Risk",
    cell: ({ row }) => renderRiskOrCaseStatus(row.original.risk),
  },
  {
    accessorKey: "age",
    header: "Age",
  },
  {
    accessorKey: "referralFrom",
    header: "Referral From",
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

type Colors = {
  [key: string]: string;
};

const colors: Colors = {
  Active: "bg-muted-green",
  FollowUp: "bg-muted-yellow",
  Referred: "bg-muted-pink",
  Terminated: "bg-muted-sky",
  Low: "bg-muted-green",
  Mid: "bg-muted-yellow",
  High: "bg-shamiri-red",
  Severe: "bg-shamiri-red",
};

function renderRiskOrCaseStatus(value: string) {
  return <Badge className={cn(colors[value], "text-white")}>{value}</Badge>;
}
