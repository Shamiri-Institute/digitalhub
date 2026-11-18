"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNowStrict } from "date-fns";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "#/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import type { FullTicket } from "#/lib/actions/ticket/types";
import { formatDateIn } from "#/lib/date-utils";
import { sortBy } from "#/lib/table-view";
import { Person } from "./person";
import { PriorityBadge } from "./priority-badge";
import { sentenceLabel, personName, prioritiesLowToHigh, statusBadgeVariant } from "./format";

export const hiddenTicketColumns = {
  "Ticket #": false,
  "Raised by": false,
  Resolved: false,
  Closed: false,
};

export const columns = (
  basePath: string,
  viewerId: string | null,
  timeZone: string | null,
): ColumnDef<FullTicket>[] => [
  {
    accessorFn: (ticket) => `#${ticket.visibleId}`,
    id: "Ticket #",
    header: "Ticket #",
    sortingFn: sortBy((ticket) => ticket.visibleId),
  },
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
    cell: ({ row }) => sentenceLabel(row.original.category),
  },
  {
    accessorKey: "priority",
    id: "Priority",
    header: "Priority",
    sortingFn: sortBy((ticket) => prioritiesLowToHigh.indexOf(ticket.priority)),
    cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
  },
  {
    accessorKey: "status",
    id: "Status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusBadgeVariant[row.original.status]} className="select-none">
        {sentenceLabel(row.original.status)}
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
    cell: ({ row }) => {
      const age = (
        // The age is worked out again in the browser, which may cross a unit since the server render.
        <span suppressHydrationWarning>
          {formatDistanceToNowStrict(row.original.createdAt, {
            addSuffix: true,
            roundingMethod: "floor",
          })}
        </span>
      );
      if (!timeZone) return age;
      return (
        <Tooltip>
          <TooltipTrigger className="cursor-default rounded-sm focus-visible:outline-2 focus-visible:outline-shamiri-new-blue">
            {age}
          </TooltipTrigger>
          <TooltipContent>{formatDateIn(row.original.createdAt, timeZone)}</TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    accessorFn: (ticket) => personName(ticket.createdBy),
    id: "Raised by",
    header: "Raised by",
    cell: ({ row }) => (
      <Person person={row.original.createdBy} viewerId={viewerId} emphasis={false} />
    ),
  },
  {
    // Undefined, not null, so tickets not yet resolved or closed stay last in either direction.
    accessorFn: (ticket) => ticket.resolvedAt ?? undefined,
    id: "Resolved",
    header: "Resolved",
    enableGlobalFilter: false,
    sortUndefined: "last",
    cell: ({ row }) =>
      timeZone && row.original.resolvedAt && formatDateIn(row.original.resolvedAt, timeZone),
  },
  {
    accessorFn: (ticket) => ticket.closedAt ?? undefined,
    id: "Closed",
    header: "Closed",
    enableGlobalFilter: false,
    sortUndefined: "last",
    cell: ({ row }) =>
      timeZone && row.original.closedAt && formatDateIn(row.original.closedAt, timeZone),
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
