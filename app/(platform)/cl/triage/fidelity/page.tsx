import { Suspense } from "react";
import { getTriageFidelityData } from "#/app/(platform)/cl/triage/fidelity/action";
import FidelityDataTable from "#/app/(platform)/cl/triage/fidelity/fidelity-data-table";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";

async function FidelityContent() {
  const rows = await getTriageFidelityData();
  return <FidelityDataTable rows={rows} />;
}

const FIDELITY_SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5", "r6"];

function TableSkeleton() {
  return (
    <div className="rounded-lg border">
      {FIDELITY_SKELETON_ROWS.map((id) => (
        <div key={id} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export default function TriageFidelityPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="container flex min-h-0 w-full flex-1 flex-col space-y-6 py-10">
        <div>
          <PageHeading title="Triage fidelity" />
          <p className="mt-1 text-sm text-shamiri-text-grey">
            Per-fellow triage completion and quality metrics. Flagged values (⚠) fall outside
            expected ranges — triage rate &lt;10% or &gt;80%, escalation compliance &lt;95%.
          </p>
        </div>
        <Separator />
        <Suspense fallback={<TableSkeleton />}>
          <FidelityContent />
        </Suspense>
      </div>
    </div>
  );
}
