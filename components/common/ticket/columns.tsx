"use client";

import type { ImplementerRole } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import { TicketDropdown } from "#/components/common/ticket/ticket-dropdown";
import type { FullTicket } from "#/lib/actions/ticket/types";
import { cn } from "#/lib/utils";

export type TicketData = FullTicket;

export const columns = (state: {
  setTicket: Dispatch<SetStateAction<TicketData | undefined>>;
  setViewDialog: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
}): ColumnDef<TicketData>[] => {
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
          <span className="text-shamiri-text-grey text-sm">No escalation</span>
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
          OPEN: { bg: "bg-yellow-bg", border: "border-yellow-border", text: "text-yellow-base" },
          ESCALATED: { bg: "bg-blue-bg", border: "border-blue-border", text: "text-blue-base" },
          RESOLVED: { bg: "bg-green-bg", border: "border-green-border", text: "text-green-base" },
          CANCELLED: { bg: "bg-red-bg", border: "border-red-border", text: "text-red-base" },
        };
        const s = styles[status] ?? {
          bg: "bg-yellow-bg",
          border: "border-yellow-border",
          text: "text-yellow-base",
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
