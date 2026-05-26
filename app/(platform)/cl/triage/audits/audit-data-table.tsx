"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { AuditRow } from "#/app/(platform)/cl/triage/audits/action";
import DataTable from "#/components/data-table";
import { cn } from "#/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  riskScreenOutcome: "Risk screen outcome",
  riskNotCompletedReason: "Not-completed reason",
  actionTaken: "Action taken",
  referredSupervisorId: "Referred supervisor",
  supervisorHandoffStatus: "Handoff status",
  note: "Note",
};

const VALUE_LABELS: Record<string, string> = {
  ALL_NO: "All NO",
  ANY_YES: "Any YES",
  NOT_COMPLETED: "Not completed",
  STUDENT_LEFT: "Student left",
  NO_PRIVACY: "No privacy",
  TIME_CONSTRAINTS: "Time constraints",
  OTHER: "Other",
  SUPPORTED: "Supported",
  REFERRED: "Referred",
  ESCALATED: "Escalated",
  REFUSED: "Refused",
  INTERRUPTED: "Interrupted",
  WARM_HANDOFF: "Warm handoff",
  SUPERVISOR_NOTIFIED: "Supervisor notified",
  COULD_NOT_REACH: "Could not reach",
  STUDENT_REFUSED_NOTIFIED: "Student refused (notified)",
};

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  const str = String(val);
  return VALUE_LABELS[str] ?? str;
}

function DiffCell({
  changedFields,
  before,
  after,
}: {
  changedFields: string[];
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}) {
  if (changedFields.length === 0)
    return <span className="text-xs text-shamiri-text-grey">No changes recorded</span>;
  return (
    <div className="space-y-1">
      {changedFields.map((field) => (
        <div key={field} className="text-xs">
          <span className="font-medium">{FIELD_LABELS[field] ?? field}: </span>
          <span className="line-through text-shamiri-light-red">{formatValue(before[field])}</span>
          <span className="mx-1 text-shamiri-text-grey">→</span>
          <span className="text-green-base">{formatValue(after[field])}</span>
        </div>
      ))}
    </div>
  );
}

const columns: ColumnDef<AuditRow>[] = [
  {
    id: "Fellow",
    accessorKey: "fellowName",
    header: "Fellow",
  },
  {
    id: "Session",
    accessorKey: "sessionLabel",
    header: "Session",
    cell: ({ row }) => <span className="text-shamiri-text-grey">{row.original.sessionLabel}</span>,
  },
  {
    id: "Session date",
    header: "Session date",
    cell: ({ row }) => {
      const date = row.original.sessionDate;
      return (
        <span className="text-shamiri-text-grey">
          {date
            ? new Date(date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </span>
      );
    },
  },
  {
    id: "Edit time",
    header: "Edit time",
    cell: ({ row }) => (
      <span className="text-shamiri-text-grey">
        {row.original.editedAt.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    ),
  },
  {
    id: "Hours after session",
    header: "Hours after session",
    cell: ({ row }) => {
      const hours = row.original.hoursAfterSession;
      return hours !== null ? (
        <span className={cn(hours > 24 && "font-medium text-yellow-600")}>{hours}h</span>
      ) : (
        <span className="text-shamiri-text-grey">—</span>
      );
    },
  },
  {
    id: "Edited by",
    accessorKey: "editedByName",
    header: "Edited by",
  },
  {
    id: "What changed",
    header: "What changed",
    cell: ({ row }) => (
      <DiffCell
        changedFields={row.original.changedFields}
        before={row.original.before}
        after={row.original.after}
      />
    ),
  },
];

export default function AuditDataTable({ audits }: { audits: AuditRow[] }) {
  return (
    <DataTable
      data={audits}
      columns={columns}
      className="data-table bg-white"
      emptyStateMessage="No edited triage records in this hub yet."
      columnVisibilityState={{ Session: false, "Session date": false }}
    />
  );
}
