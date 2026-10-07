import { signOut } from "next-auth/react";
import { Suspense } from "react";
import {
  getFellowsForSupervisor,
  getTriageDashboardStats,
  getTriageEventsForSupervisor,
} from "#/app/(platform)/sc/triage/action";
import FellowActivitySection from "#/app/(platform)/sc/triage/components/fellow-activity-section";
import RequiresActionSection from "#/app/(platform)/sc/triage/components/requires-action-section";
import TriagePageLoading from "#/app/(platform)/sc/triage/loading";
import { currentSupervisor } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

async function TriageStats() {
  const stats = await getTriageDashboardStats();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div
        className={cn(
          "rounded-lg border p-4 space-y-1",
          stats.unactionedCount > 0 && "border-red-border bg-red-bg",
        )}
      >
        <p className="text-xs text-shamiri-text-grey">Requires my action</p>
        <p className={cn("text-2xl font-bold", stats.unactionedCount > 0 && "text-red-base")}>
          {stats.unactionedCount}
        </p>
      </div>
      <div
        className={cn(
          "rounded-lg border p-4 space-y-1",
          stats.overdueCount > 0 && "border-red-border bg-red-bg",
        )}
      >
        <p className="text-xs text-shamiri-text-grey">Overdue (&gt;3 days)</p>
        <p className={cn("text-2xl font-bold", stats.overdueCount > 0 && "text-red-base")}>
          {stats.overdueCount}
        </p>
      </div>
      <div className="rounded-lg border p-4 space-y-1">
        <p className="text-xs text-shamiri-text-grey">Triage events this week</p>
        <p className="text-2xl font-bold">{stats.triageThisWeek}</p>
      </div>
      <div
        className={cn(
          "rounded-lg border p-4 space-y-1",
          stats.riskPositiveThisWeek > 0 && "border-yellow-200 bg-yellow-50",
        )}
      >
        <p className="text-xs text-shamiri-text-grey">Risk positive this week</p>
        <p
          className={cn("text-2xl font-bold", stats.riskPositiveThisWeek > 0 && "text-yellow-700")}
        >
          {stats.riskPositiveThisWeek}
        </p>
      </div>
    </div>
  );
}

const STAT_SKELETONS = ["s1", "s2", "s3", "s4"];

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {STAT_SKELETONS.map((id) => (
        <div key={id} className="rounded-lg border p-4 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </div>
  );
}

async function TriageContent() {
  const supervisor = await currentSupervisor();
  if (!supervisor?.profile) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }

  const supervisorId = supervisor.profile.id;
  const [events, fellows] = await Promise.all([
    getTriageEventsForSupervisor(),
    getFellowsForSupervisor(),
  ]);

  return (
    <div className="space-y-8">
      <RequiresActionSection events={events} />
      <Separator />
      <FellowActivitySection events={events} fellows={fellows} supervisorId={supervisorId} />
    </div>
  );
}

export default function TriagePage() {
  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title="Triage" />
        <Separator />
        <Suspense fallback={<StatsSkeleton />}>
          <TriageStats />
        </Suspense>
        <Separator />
        <Suspense fallback={<TriagePageLoading />}>
          <TriageContent />
        </Suspense>
      </div>
      <PageFooter />
    </div>
  );
}
