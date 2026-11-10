"use client";

import { type ImplementerRole, TicketPriorityLevel } from "#/db/enums";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { TicketDropdown } from "#/components/common/ticket/ticket-dropdown";
import type { FullTicket } from "#/lib/actions/ticket/types";
import { sortBy } from "#/lib/table-view";
import { cn } from "#/lib/utils";

export type TicketData = FullTicket;

const prioritiesLowToHigh: TicketPriorityLevel[] = [
  TicketPriorityLevel.LOW,
  TicketPriorityLevel.MEDIUM,
  TicketPriorityLevel.HIGH,
];

export type TicketDialogKind =
  | "view"
  | "resolve"
  | "viewResolution"
  | "escalate"
  | "reassign"
  | "viewReassignment";

export type TicketTableState = {
  openDialog: (kind: TicketDialogKind, ticket: TicketData) => void;
  role: ImplementerRole;
};

export const columns = (state: TicketTableState): ColumnDef<TicketData>[] => {
  return [
    {
      accessorKey: "createdAt",
      id: "Created Date",
      header: "Created Date",
      cell: ({ row }) => {
        return format(new Date(row.original.createdAt), "dd MMM yyyy");
      },
    },
    {
      accessorKey: "subject",
      id: "Subject",
      header: "Subject",
      cell: ({ row }) => {
        return (
          <span className="text-sm max-w-xs truncate" title={row.original.subject}>
            {row.original.subject}
          </span>
        );
      },
    },
    {
      accessorKey: "category",
      id: "Category",
      header: "Category",
      cell: ({ row }) => {
        return <span className="text-sm">{row.original.category.toLowerCase()}</span>;
      },
    },
    {
      accessorKey: "priority",
      id: "Priority",
      header: "Priority",
      sortingFn: sortBy((ticket) => prioritiesLowToHigh.indexOf(ticket.priority)),
      cell: ({ row }) => {
        return <span className="text-sm">{row.original.priority.toLowerCase()}</span>;
      },
    },
    {
      accessorKey: "currentTier",
      id: "Current Tier",
      header: "Current Tier",
      cell: ({ row }) => {
        const tier = row.original.currentTier;
        return tier ? (
          <span className="text-sm">{tier.toLowerCase().replace("_", " ")}</span>
        ) : (
          <span className="text-muted-foreground text-sm">No escalation</span>
        );
      },
    },
    {
      accessorKey: "status",
      id: "Status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        const styles: Record<string, { bg: string; border: string; text: string }> = {
          OPEN: { bg: "bg-warning-bg", border: "border-warning-border", text: "text-warning" },
          ESCALATED: { bg: "bg-info-bg", border: "border-info-border", text: "text-info" },
          RESOLVED: { bg: "bg-success-bg", border: "border-success-border", text: "text-success" },
          CANCELLED: {
            bg: "bg-destructive-bg",
            border: "border-destructive-border",
            text: "text-destructive",
          },
        };
        const s = styles[status] ?? {
          bg: "bg-warning-bg",
          border: "border-warning-border",
          text: "text-warning",
        };
        return (
          <div className="flex">
            <div className={cn("select-none rounded-lg border px-1.5 py-0.5", s.bg, s.border)}>
              <span className={cn("text-[0.825rem] font-semibold", s.text)}>
                {status.toLowerCase()}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: "button",
      cell: ({ row }) => <TicketDropdown ticket={row.original} state={state} />,
      enableHiding: false,
    },
  ];
};
