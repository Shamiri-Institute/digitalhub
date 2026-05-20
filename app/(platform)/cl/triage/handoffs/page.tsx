import { Suspense } from "react";
import { getHandoffQualityData } from "#/app/(platform)/cl/triage/handoffs/action";
import HandoffDataTable from "#/app/(platform)/cl/triage/handoffs/handoff-data-table";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";

async function HandoffContent() {
  const rows = await getHandoffQualityData();
  return <HandoffDataTable rows={rows} />;
}

const HANDOFF_SKELETON_ROWS = ["r1", "r2", "r3", "r4"];

function TableSkeleton() {
  return (
    <div className="rounded-lg border">
      {HANDOFF_SKELETON_ROWS.map((id) => (
        <div key={id} className="flex gap-4 border-b px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export default function HandoffQualityPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="container flex min-h-0 w-full flex-1 flex-col space-y-6 py-10">
        <div>
          <PageHeading title="Handoff quality" />
          <p className="mt-1 text-sm text-shamiri-text-grey">
            Distribution of supervisor handoff outcomes per supervisor. A &ldquo;Could not
            reach&rdquo; rate &gt;15% (⚠) indicates a structural contact problem.
          </p>
        </div>
        <Separator />
        <Suspense fallback={<TableSkeleton />}>
          <HandoffContent />
        </Suspense>
      </div>
    </div>
  );
}
