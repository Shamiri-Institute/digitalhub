import { AlertTriangle } from "lucide-react";
import { Suspense } from "react";
import { getEscalationGaps, getGapReportStats } from "#/app/(platform)/cl/triage/gaps/action";
import GapDataTable from "#/app/(platform)/cl/triage/gaps/gap-data-table";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

async function GapStats() {
  const stats = await getGapReportStats();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-lg border p-4">
        <p className="text-xs text-shamiri-text-grey">Total escalations</p>
        <p className="mt-1 text-2xl font-bold">{stats.totalEscalations}</p>
      </div>
      <div
        className={cn(
          "rounded-lg border p-4",
          stats.totalGaps > 0 && "border-red-border bg-red-bg",
        )}
      >
        <p className="text-xs text-shamiri-text-grey">No case opened</p>
        <p className={cn("mt-1 text-2xl font-bold", stats.totalGaps > 0 && "text-red-base")}>
          {stats.totalGaps}
        </p>
      </div>
      <div
        className={cn(
          "rounded-lg border p-4",
          stats.overdueCount > 0 && "border-red-border bg-red-bg",
        )}
      >
        <p className="text-xs text-shamiri-text-grey">Overdue (&gt;3 days)</p>
        <p className={cn("mt-1 text-2xl font-bold", stats.overdueCount > 0 && "text-red-base")}>
          {stats.overdueCount}
        </p>
      </div>
      <div className="rounded-lg border p-4">
        <p className="text-xs text-shamiri-text-grey">Case conversion rate</p>
        <p className="mt-1 text-2xl font-bold">{stats.conversionRate}%</p>
      </div>
    </div>
  );
}

async function GapContent() {
  const gaps = await getEscalationGaps();
  return <GapDataTable gaps={gaps} />;
}

const GAPS_STAT_SKELETONS = ["s1", "s2", "s3", "s4"];
const GAPS_SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5"];

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {GAPS_STAT_SKELETONS.map((id) => (
        <div key={id} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border">
      {GAPS_SKELETON_ROWS.map((id) => (
        <div key={id} className="flex gap-4 border-b px-4 py-3 last:border-0">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

export default function EscalationGapsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="container flex min-h-0 w-full flex-1 flex-col space-y-6 py-10">
        <div className="flex items-start justify-between">
          <div>
            <PageHeading title="Escalation gap report" />
            <p className="mt-1 text-sm text-shamiri-text-grey">
              Risk-positive triage events with no open clinical case. Any non-zero list requires
              immediate attention.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-red-bg px-3 py-1.5 text-xs font-medium text-red-base">
            <AlertTriangle className="h-3.5 w-3.5" />
            Safety-critical view
          </div>
        </div>
        <Suspense fallback={<StatsSkeleton />}>
          <GapStats />
        </Suspense>
        <Separator />
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Unmatched escalations — sorted oldest first</h2>
          <p className="text-xs text-shamiri-text-grey">
            Days elapsed is shown in red when &gt;3 days and dark red when &gt;7 days.
          </p>
        </div>
        <Suspense fallback={<TableSkeleton />}>
          <GapContent />
        </Suspense>
      </div>
    </div>
  );
}
