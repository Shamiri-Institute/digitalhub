"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { HandoffRow } from "#/app/(platform)/cl/triage/handoffs/action";
import DataTable from "#/components/data-table";
import { cn } from "#/lib/utils";

function CountPctCell({
  count,
  pct,
  flag = false,
}: {
  count: number;
  pct: number;
  flag?: boolean;
}) {
  return (
    <span className={cn(flag && "font-semibold text-destructive")}>
      {count} ({pct}%){flag && " ⚠"}
    </span>
  );
}

const columns: ColumnDef<HandoffRow>[] = [
  {
    id: "Supervisor",
    accessorKey: "supervisorName",
    header: "Supervisor",
  },
  {
    id: "Total escalations",
    accessorKey: "total",
    header: "Total escalations",
    meta: { numeric: true },
  },
  {
    id: "Warm handoff",
    header: "Warm handoff",
    meta: { numeric: true },
    cell: ({ row }) => (
      <CountPctCell count={row.original.warmHandoff} pct={row.original.warmHandoffPct} />
    ),
  },
  {
    id: "Supervisor notified",
    header: "Supervisor notified",
    meta: { numeric: true },
    cell: ({ row }) => (
      <CountPctCell count={row.original.notified} pct={row.original.notifiedPct} />
    ),
  },
  {
    id: "Could not reach",
    header: "Could not reach",
    meta: { numeric: true },
    cell: ({ row }) => (
      <CountPctCell
        count={row.original.couldNotReach}
        pct={row.original.couldNotReachPct}
        flag={row.original.couldNotReachFlag}
      />
    ),
  },
  {
    id: "Student refused",
    header: "Student refused",
    meta: { numeric: true },
    cell: ({ row }) => <CountPctCell count={row.original.refused} pct={row.original.refusedPct} />,
  },
];

export default function HandoffDataTable({ rows }: { rows: HandoffRow[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      className="data-table bg-white"
      emptyStateMessage="No escalation or referral events recorded in this hub yet."
      disablePagination={true}
      columnVisibilityState={{ "Supervisor notified": false, "Student refused": false }}
    />
  );
}
