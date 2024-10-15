"use client";

import { HubSupervisorExpensesType } from "#/app/(platform)/hc/reporting/supervisors/actions";
import { ColumnDef } from "@tanstack/react-table";
import HCSupervisorExpenseDropdownMenu from "./supervisors-expenses-actions-dropdown-me";

export const columns: ColumnDef<HubSupervisorExpensesType>[] = [
  {
    accessorKey: "dateCreated",
    header: "Date Created",
  },
  {
    accessorKey: "dateOfExpense",
    header: "Date of Expense",
  },
  {
    accessorKey: "supervisorName",
    header: "Supervisor Name",
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
    accessorKey: "status",
    header: "Status",
  },
  {
    id: "button",
    cell: ({ row }) => (
      <HCSupervisorExpenseDropdownMenu expense={row.original} />
    ),
    enableHiding: false,
  },
];
