"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { EscalationGap } from "#/app/(platform)/cl/triage/gaps/action";
import DataTable from "#/components/data-table";
import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";

const HANDOFF_LABELS: Record<string, string> = {
  WARM_HANDOFF: "Warm handoff",
  SUPERVISOR_NOTIFIED: "Notified",
  COULD_NOT_REACH: "Could not reach",
  STUDENT_REFUSED_NOTIFIED: "Student refused",
};

const columns: ColumnDef<EscalationGap>[] = [
  {
    id: "Student",
    header: "Student",
    accessorFn: (e) => e.student.studentName ?? e.student.visibleId ?? "—",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.student.studentName ?? row.original.student.visibleId ?? "—"}
      </span>
    ),
  },
  {
    id: "School",
    header: "School",
    accessorFn: (e) => e.student.school?.schoolName ?? "—",
    cell: ({ row }) => <span>{row.original.student.school?.schoolName ?? "—"}</span>,
  },
  {
    id: "Fellow",
    header: "Fellow",
    accessorFn: (e) => e.fellow.fellowName ?? "—",
  },
  {
    id: "Escalation date",
    header: "Escalation date",
    cell: ({ row }) => (
      <span className="text-shamiri-text-grey">
        {row.original.createdAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </span>
    ),
  },
  {
    id: "Days elapsed",
    header: "Days elapsed",
    cell: ({ row }) => {
      const days = row.original.daysSince;
      return (
        <span
          className={cn(
            "font-medium",
            days > 7 && "text-red-700",
            days > 3 && days <= 7 && "text-red-base",
          )}
        >
          {days}d
        </span>
      );
    },
  },
  {
    id: "Referred supervisor",
    header: "Referred supervisor",
    cell: ({ row }) => {
      const name = row.original.referredSupervisor?.supervisorName;
      return name ? (
        <span>{name}</span>
      ) : (
        <Badge variant="outline" className="text-shamiri-text-grey">
          Unassigned
        </Badge>
      );
    },
  },
  {
    id: "Handoff status",
    header: "Handoff status",
    cell: ({ row }) => {
      const status = row.original.supervisorHandoffStatus;
      const isRed = status === "COULD_NOT_REACH";
      const label = status ? (HANDOFF_LABELS[status] ?? status) : "Not recorded";
      return <span className={cn(isRed && "text-red-base font-medium")}>{label}</span>;
    },
  },
];

export default function GapDataTable({ gaps }: { gaps: EscalationGap[] }) {
  return (
    <DataTable
      data={gaps}
      columns={columns}
      className="data-table bg-white"
      emptyStateMessage="All escalations have open cases — every risk-positive triage event in this hub has a corresponding clinical case."
      columnVisibilityState={{ Fellow: false, "Escalation date": false }}
    />
  );
}
