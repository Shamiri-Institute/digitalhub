"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { FidelityRow } from "#/app/(platform)/cl/triage/fidelity/action";
import DataTable from "#/components/data-table";
import { cn } from "#/lib/utils";

function FlagCell({
  value,
  flag,
  suffix = "%",
}: {
  value: number;
  flag: boolean;
  suffix?: string;
}) {
  return (
    <span className={cn(flag && "font-semibold text-shamiri-light-red")}>
      {value}
      {suffix}
      {flag && " ⚠"}
    </span>
  );
}

const columns: ColumnDef<FidelityRow>[] = [
  {
    id: "Fellow",
    accessorKey: "fellowName",
    header: "Fellow",
  },
  {
    id: "Supervisor",
    accessorKey: "supervisorName",
    header: "Supervisor",
    cell: ({ row }) => (
      <span className="text-shamiri-text-grey">{row.original.supervisorName}</span>
    ),
  },
  {
    id: "Schools",
    accessorKey: "schools",
    header: "Schools",
    cell: ({ row }) => <span className="text-shamiri-text-grey">{row.original.schools}</span>,
  },
  {
    id: "Sessions",
    accessorKey: "sessionsAttended",
    header: "Sessions",
  },
  {
    id: "Triage events",
    accessorKey: "triageEvents",
    header: "Triage events",
  },
  {
    id: "Triage rate",
    header: "Triage rate",
    cell: ({ row }) => (
      <FlagCell value={row.original.triageRate} flag={row.original.triageRateFlag} />
    ),
  },
  {
    id: "Risk positive",
    accessorKey: "riskPositive",
    header: "Risk positive",
  },
  {
    id: "Escalation compliance",
    header: "Escalation compliance",
    cell: ({ row }) => (
      <FlagCell value={row.original.escalationCompliance} flag={row.original.complianceFlag} />
    ),
  },
  {
    id: "Screen completion",
    header: "Screen completion",
    accessorFn: (row) => `${row.screenCompletionRate}%`,
  },
];

export default function FidelityDataTable({ rows }: { rows: FidelityRow[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      className="data-table bg-white"
      emptyStateMessage="No fellows assigned to this hub yet."
      columnVisibilityState={{ Schools: false, "Risk positive": false, "Screen completion": false }}
    />
  );
}
