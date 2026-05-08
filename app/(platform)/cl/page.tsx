import { signOut } from "next-auth/react";
import Link from "next/link";
import { Suspense } from "react";
import { getClinicalLeadTriageStats } from "#/app/(platform)/cl/triage/dashboard-stats";
import { currentClinicalLead } from "#/app/auth";
import PageFooter from "#/components/ui/page-footer";
import PageHeading from "#/components/ui/page-heading";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";

type AlertLevel = "red" | "amber" | "none";

function StatCard({
  label,
  value,
  suffix = "",
  alert,
  href,
}: {
  label: string;
  value: number;
  suffix?: string;
  alert: AlertLevel;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-1 transition-colors",
        alert === "red" && "border-red-border bg-red-bg",
        alert === "amber" && "border-yellow-200 bg-yellow-50",
        href && "hover:border-shamiri-new-blue/40 cursor-pointer",
      )}
    >
      <p className="text-xs text-shamiri-text-grey">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold",
          alert === "red" && "text-red-base",
          alert === "amber" && "text-yellow-700",
        )}
      >
        {value}
        {suffix}
      </p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

async function TriageWidget() {
  const stats = await getClinicalLeadTriageStats();

  const completionAlert: AlertLevel =
    stats.completionRate < 40 ? "red" : stats.completionRate < 60 ? "amber" : "none";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Triage health</h2>
        <Link href="/cl/triage/gaps" className="text-xs text-shamiri-new-blue hover:underline">
          View escalation gaps →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Unactioned escalations"
          value={stats.unactionedCount}
          alert={stats.unactionedCount > 0 ? "red" : "none"}
          href="/cl/triage/gaps"
        />
        <StatCard
          label="Gaps >3 days old"
          value={stats.overdueCount}
          alert={stats.overdueCount > 0 ? "red" : "none"}
          href="/cl/triage/gaps"
        />
        <StatCard
          label="Hub completion rate"
          value={stats.completionRate}
          suffix="%"
          alert={completionAlert}
          href="/cl/triage/fidelity"
        />
        <StatCard
          label="Escalation compliance"
          value={stats.escalationCompliance}
          suffix="%"
          alert={stats.escalationCompliance < 95 ? "red" : "none"}
          href="/cl/triage/fidelity"
        />
        <StatCard
          label="Fellows with 0 triage (>3 sessions)"
          value={stats.fellowsZeroTriage}
          alert={stats.fellowsZeroTriage > 0 ? "amber" : "none"}
          href="/cl/triage/fidelity"
        />
      </div>
    </div>
  );
}

function TriageWidgetSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ClinicalLeadPage() {
  const clinicalLead = await currentClinicalLead();
  if (!clinicalLead) {
    await signOut({ callbackUrl: "/login" });
    return null;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-6 py-10">
        <PageHeading
          title={`Welcome, ${clinicalLead.profile?.clinicalLeadName ?? "Clinical Lead"}`}
        />
        <Separator />
        <Suspense fallback={<TriageWidgetSkeleton />}>
          <TriageWidget />
        </Suspense>
      </div>
      <PageFooter />
    </div>
  );
}
