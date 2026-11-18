"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "#/components/ui/badge";
import type { FullTicket } from "#/lib/actions/ticket/types";
import { formatDateIn } from "#/lib/date-utils";
import { sortBy } from "#/lib/table-view";
import { Person } from "./person";
import {
  capitalise,
  personName,
  prioritiesLowToHigh,
  priorityBadgeVariant,
  statusBadgeVariant,
} from "./format";

export type TicketData = FullTicket;

export const columns = (
  basePath: string,
  viewerId: string | null,
  timeZone: string | null,
): ColumnDef<TicketData>[] => [
  {
    accessorKey: "subject",
    id: "Subject",
    header: "Subject",
    meta: { headerClassName: "lg:w-96" },
    cell: ({ row }) => (
      <Link
        href={`${basePath}/${row.original.id}`}
        title={row.original.subject}
        className="block max-w-sm truncate font-semibold text-shamiri-black hover:underline"
      >
        {row.original.subject}
      </Link>
    ),
  },
  {
    accessorKey: "category",
    id: "Category",
    header: "Category",
    cell: ({ row }) => capitalise(row.original.category),
  },
  {
    accessorKey: "priority",
    id: "Priority",
    header: "Priority",
    sortingFn: sortBy((ticket) => prioritiesLowToHigh.indexOf(ticket.priority)),
    cell: ({ row }) => {
      const variant = priorityBadgeVariant[row.original.priority];
      const label = capitalise(row.original.priority);
      return variant ? (
        <Badge variant={variant} className="select-none">
          {label}
        </Badge>
      ) : (
        label
      );
    },
  },
  {
    accessorKey: "status",
    id: "Status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusBadgeVariant[row.original.status]} className="select-none">
        {capitalise(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorFn: (ticket) => personName(ticket.holder),
    id: "Held by",
    header: "Held by",
    cell: ({ row }) => {
      return <Person person={row.original.holder} viewerId={viewerId} emphasis={false} />;
    },
  },
  {
    accessorKey: "createdAt",
    id: "Opened",
    header: "Opened",
    enableGlobalFilter: false,
    cell: ({ row }) => timeZone && formatDateIn(row.original.createdAt, timeZone),
  },
  {
    id: "button",
    cell: ({ row }) => (
      <Link
        href={`${basePath}/${row.original.id}`}
        aria-label={`Open ${row.original.subject}`}
        className="absolute inset-0 flex items-center justify-center border-l text-shamiri-text-grey hover:text-shamiri-new-blue"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    ),
    enableHiding: false,
  },
];
