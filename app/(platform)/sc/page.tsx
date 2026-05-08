import Link from "next/link";
import { signOut } from "next-auth/react";
import { Suspense } from "react";
import { getTriageDashboardStats } from "#/app/(platform)/sc/triage/action";
import { currentSupervisor } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

function StatCard({
  label,
  value,
  alert,
  href,
}: {
  label: string;
  value: number;
  alert: boolean;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-1 transition-colors",
        alert && "border-red-border bg-red-bg",
        href && "hover:border-shamiri-new-blue/40 cursor-pointer",
      )}
    >
      <p className="text-xs text-shamiri-text-grey">{label}</p>
      <p className={cn("text-2xl font-bold", alert && "text-red-base")}>{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

async function TriageWidget() {
  const stats = await getTriageDashboardStats();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Triage</h2>
        <Link href="/sc/triage" className="text-xs text-shamiri-new-blue hover:underline">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="Unactioned escalations"
          value={stats.unactionedCount}
          alert={stats.unactionedCount > 0}
          href="/sc/triage"
        />
        <StatCard
          label="Overdue >3 days"
          value={stats.overdueCount}
          alert={stats.overdueCount > 0}
          href="/sc/triage"
        />
        <StatCard label="Triage events this week" value={stats.triageThisWeek} alert={false} />
        <StatCard
          label="Risk-positive this week"
          value={stats.riskPositiveThisWeek}
          alert={false}
        />
      </div>
    </div>
  );
}

function TriageWidgetSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-12" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SupervisorPage() {
  const supervisor = await currentSupervisor();
  if (!supervisor) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading title={`Welcome, ${supervisor.profile?.supervisorName ?? "Supervisor"}`} />
        <Separator />
        <Suspense fallback={<TriageWidgetSkeleton />}>
          <TriageWidget />
        </Suspense>
      </div>
      <PageFooter />
    </div>
  );
}
