import { Suspense } from "react";
import { getTriageAuditTrail } from "#/app/(platform)/cl/triage/audits/action";
import AuditDataTable from "#/app/(platform)/cl/triage/audits/audit-data-table";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";

async function AuditContent() {
  const audits = await getTriageAuditTrail();
  return <AuditDataTable audits={audits} />;
}

const AUDIT_SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5"];

function TableSkeleton() {
  return (
    <div className="rounded-lg border">
      {AUDIT_SKELETON_ROWS.map((id) => (
        <div key={id} className="flex gap-4 border-b px-4 py-3 last:border-0">
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
          <AuditContent />
        </Suspense>
      </div>
    </div>
  );
}
