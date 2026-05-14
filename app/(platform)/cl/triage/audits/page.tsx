import { Suspense } from "react";
import { getTriageAuditTrail } from "#/app/(platform)/cl/triage/audits/action";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
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
    return <span className="text-shamiri-text-grey text-xs">No changes recorded</span>;
  return (
    <div className="space-y-1">
      {changedFields.map((field) => (
        <div key={field} className="text-xs">
          <span className="font-medium">{FIELD_LABELS[field] ?? field}: </span>
          <span className="text-shamiri-light-red line-through">{formatValue(before[field])}</span>
          <span className="mx-1 text-shamiri-text-grey">→</span>
          <span className="text-green-base">{formatValue(after[field])}</span>
        </div>
      ))}
    </div>
  );
}

async function AuditTable() {
  const audits = await getTriageAuditTrail();

  if (audits.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-shamiri-text-grey">No edited triage records in this hub yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fellow</TableHead>
            <TableHead>Session</TableHead>
            <TableHead>Session date</TableHead>
            <TableHead>Edit time</TableHead>
            <TableHead>Hours after session</TableHead>
            <TableHead>Edited by</TableHead>
            <TableHead>What changed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {audits.map((audit) => (
            <TableRow key={audit.id}>
              <TableCell className="font-medium">{audit.fellowName}</TableCell>
              <TableCell className="text-sm text-shamiri-text-grey">{audit.sessionLabel}</TableCell>
              <TableCell className="text-sm text-shamiri-text-grey">
                {audit.sessionDate
                  ? new Date(audit.sessionDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </TableCell>
              <TableCell className="text-sm text-shamiri-text-grey">
                {audit.editedAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell>
                {audit.hoursAfterSession !== null ? (
                  <span
                    className={cn(
                      "text-sm",
                      audit.hoursAfterSession > 24 && "font-medium text-yellow-600",
                    )}
                  >
                    {audit.hoursAfterSession}h
                  </span>
                ) : (
                  <span className="text-shamiri-text-grey text-sm">—</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{audit.editedByName}</TableCell>
              <TableCell>
                <DiffCell
                  changedFields={audit.changedFields}
                  before={audit.before}
                  after={audit.after}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-48" />
        </div>
      ))}
    </div>
  );
}

export default function TriageAuditTrailPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="container flex min-h-0 w-full flex-1 flex-col space-y-6 py-10">
        <div>
          <PageHeading title="Triage audit trail" />
          <p className="mt-1 text-sm text-shamiri-text-grey">
            Triage records that were edited after initial save. Edits &gt;24 hours after the session
            are highlighted. This view is for pattern detection, not punitive use.
          </p>
        </div>
        <Separator />
        <Suspense fallback={<TableSkeleton />}>
          <AuditTable />
        </Suspense>
      </div>
    </div>
  );
}
