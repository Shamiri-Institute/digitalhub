"use client";
import type { SupervisorExpensesType } from "#/app/(platform)/sc/reporting/expenses/my-expenses/actions";
import { Badge } from "#/components/ui/badge";
import type { ColumnDef } from "@tanstack/react-table";
import SupervisorExpenseDropdownMenu from "./supervisors-expenses-actions-dropdown-me";

export const columns: ColumnDef<SupervisorExpensesType>[] = [
  {
    accessorKey: "dateOfExpense",
    header: "Date of Expense",
  },
  {
    accessorKey: "typeOfExpense",
    header: "Type of Expense",
  },
  {
    accessorKey: "session",
    header: "Session",
  },
  {
    accessorKey: "destination",
    header: "Destination",
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
    cell: ({ row }) => <SupervisorExpenseDropdownMenu expense={row.original} />,
    enableHiding: false,
  },
];

function renderStatus(status: string) {
  if (status === "REJECTED") {
    return <Badge variant="destructive">Rejected</Badge>;
  }
  if (status === "APPROVED") {
    return <Badge variant="shamiri-green">Approved</Badge>;
  }
  return <Badge variant="default">Pending</Badge>;
}
