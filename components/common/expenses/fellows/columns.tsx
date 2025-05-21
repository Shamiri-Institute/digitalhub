"use client";

import { HubFellowsAttendancesType } from "#/app/(platform)/hc/reporting/expenses/fellows/actions";
import { SupervisorFellowsAttendancesType } from "#/app/(platform)/sc/reporting/expenses/fellows/actions";
import FellowExpenseTableDropdown from "#/components/common/expenses/fellows/fellow-expense-table-dropdown";
import RenderParsedPhoneNumber from "#/components/common/render-parsed-phone-number";
import { Badge } from "#/components/ui/badge";
import { Checkbox } from "#/components/ui/checkbox";
import ArrowDownIcon from "#/public/icons/arrow-drop-down.svg";
import ArrowUpIcon from "#/public/icons/arrow-up-icon.svg";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import Image from "next/image";

export const columns: ColumnDef<
  HubFellowsAttendancesType | SupervisorFellowsAttendancesType
>[] = [
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
  | HubFellowsAttendancesType["attendances"][number]
  | SupervisorFellowsAttendancesType["attendances"][number]
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
    cell: ({ row }) =>
      renderPayoutStatus(
        row.original.executedAt,
        row.original.amount,
        row.original.confirmedAt,
      ),
  },

  {
    id: "button",
    cell: ({ row }) => <FellowExpenseTableDropdown expense={row.original} />,
    enableHiding: false,
  },
];

export function renderPayoutStatus(
  status: null | Date,
  amount: number,
  confirmedAt: null | Date,
) {
  if (amount < 0) {
    if (confirmedAt !== null) {
      return (
        <Badge variant="destructive" className="text-xs">
          Payment Deducted
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="text-xs">
        Pending Deduction
      </Badge>
    );
  }

  if (amount > 0) {
    if (confirmedAt !== null) {
      return (
        <Badge variant="shamiri-green" className="text-xs">
          Payment Completed
        </Badge>
      );
    }
    if (status !== null) {
      return (
        <Badge variant="shamiri-green" className="text-xs">
          Payment Initiated
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        Payment Pending
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-xs">
      Payment Pending
    </Badge>
  );
}
