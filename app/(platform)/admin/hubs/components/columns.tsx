"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChevronRight, Info } from "lucide-react";
import Link from "next/link";

import { Tooltip, TooltipContent, TooltipTrigger } from "#/components/ui/tooltip";
import { cn } from "#/lib/utils";
import type { AdminHub } from "../queries";
import { formatCount, StateBar, states } from "./hub-stats";

const countColumn = (
  id: string,
  key: "schoolsCount" | "supervisorsCount" | "fellowsCount" | "studentsCount",
): ColumnDef<AdminHub> => ({
  accessorKey: key,
  id,
  header: () => <div className="text-right">{id}</div>,
  cell: ({ row }) => (
    <div className="text-right tabular-nums">{formatCount(row.original[key])}</div>
  ),
  enableGlobalFilter: false,
});

function SessionStatesLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex items-center gap-2.5", className)}>
      {states.map((s) => (
        <li key={s.key} className="flex items-center gap-1">
          <span aria-hidden className={cn("h-2.5 w-2.5 rounded-sm", s.swatch)} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

const sessionsBreakdown = (sessions: AdminHub["sessions"]) =>
  states.map((s) => `${formatCount(sessions[s.key])} ${s.label}`).join(", ");

const sessionsColumn: ColumnDef<AdminHub> = {
  id: "Sessions attended",
  meta: { headerClassName: "lg:w-78" },
  header: () => (
    <div className="flex items-center gap-1">
      Sessions attended
      <Tooltip>
        <TooltipTrigger
          aria-label="What the session colours mean"
          className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-shamiri-text-dark-grey hover:text-shamiri-black focus-visible:outline-2 focus-visible:outline-shamiri-new-blue"
        >
          <Info aria-hidden className="h-3.5 w-3.5" />
        </TooltipTrigger>
        <TooltipContent className="max-w-64 space-y-2 font-normal">
          <SessionStatesLegend className="flex-wrap gap-x-3 gap-y-1" />
          <p>
            Unmarked: the session date has passed, but nobody has marked it attended or cancelled.
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
  cell: ({ row }) => {
    const { sessions } = row.original;
    return (
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            aria-label={`${row.original.hubName} sessions: ${sessionsBreakdown(sessions)}`}
            className="min-w-0 flex-1 rounded-full py-1.5 focus-visible:outline-2 focus-visible:outline-shamiri-new-blue"
          >
            <StateBar counts={sessions} />
          </TooltipTrigger>
          <TooltipContent>
            <ul className="space-y-0.5">
              {states.map((s) => (
                <li key={s.key} className="flex items-center gap-1.5 tabular-nums">
                  <span aria-hidden className={cn("h-2.5 w-2.5 rounded-sm", s.swatch)} />
                  {formatCount(sessions[s.key])} {s.label}
                </li>
              ))}
            </ul>
          </TooltipContent>
        </Tooltip>
        <span className="w-24 shrink-0 tabular-nums">
          <strong className="text-shamiri-black">{formatCount(sessions.held)}</strong> of{" "}
          {formatCount(sessions.scheduled)}
        </span>
      </div>
    );
  },
};

export const columns: ColumnDef<AdminHub>[] = [
  {
    accessorKey: "hubName",
    header: "Hub",
    id: "Hub",
    meta: { headerClassName: "lg:w-56" },
    cell: ({ row }) => (
      <Link
        href={`/admin/hubs/${row.original.id}`}
        className="font-semibold text-shamiri-black hover:underline"
      >
        {row.original.hubName}
      </Link>
    ),
  },
  {
    accessorFn: (hub) => hub.coordinators.map((c) => c.coordinatorName).join(", "),
    header: "Hub managers",
    id: "Hub managers",
    meta: { headerClassName: "lg:w-64" },
    cell: ({ getValue }) => (
      <div className="max-w-xs truncate" title={getValue<string>()}>
        {getValue<string>()}
      </div>
    ),
  },
  countColumn("Schools", "schoolsCount"),
  countColumn("Supervisors", "supervisorsCount"),
  countColumn("Fellows", "fellowsCount"),
  countColumn("Students", "studentsCount"),
  sessionsColumn,
  {
    id: "button",
    cell: ({ row }) => (
      <Link
        href={`/admin/hubs/${row.original.id}`}
        aria-label={`Open ${row.original.hubName}`}
        className="absolute inset-0 flex items-center justify-center border-l text-shamiri-text-grey hover:text-shamiri-new-blue"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    ),
    enableHiding: false,
  },
];
