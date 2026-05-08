import { AlertTriangle } from "lucide-react";
import { Suspense } from "react";
import { getEscalationGaps, getGapReportStats } from "#/app/(platform)/cl/triage/gaps/action";
import { Badge } from "#/components/ui/badge";
import PageFooter from "#/components/ui/page-footer";
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

function DaysCell({ days }: { days: number }) {
  return (
    <span
      className={cn(
        "text-sm font-medium",
        days > 7 && "text-red-700",
        days > 3 && days <= 7 && "text-red-base",
      )}
    >
      {days}d
    </span>
  );
}

function HandoffCell({ status }: { status: string | null }) {
  const labels: Record<string, string> = {
    WARM_HANDOFF: "Warm handoff",
    SUPERVISOR_NOTIFIED: "Notified",
    COULD_NOT_REACH: "Could not reach",
    STUDENT_REFUSED_NOTIFIED: "Student refused",
  };
  const label = status ? (labels[status] ?? status) : "Not recorded";
  const isRed = status === "COULD_NOT_REACH";
  return <span className={cn("text-sm", isRed && "font-medium text-red-base")}>{label}</span>;
}

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

async function GapTable() {
  const gaps = await getEscalationGaps();

  if (gaps.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-green-bg">
          <AlertTriangle className="h-5 w-5 text-green-base" />
        </div>
        <p className="mt-3 text-sm font-medium">All escalations have open cases</p>
        <p className="mt-1 text-sm text-shamiri-text-grey">
          Every risk-positive triage event in this hub has a corresponding clinical case.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>School</TableHead>
            <TableHead>Fellow</TableHead>
            <TableHead>Escalation date</TableHead>
            <TableHead>Days elapsed</TableHead>
            <TableHead>Referred supervisor</TableHead>
            <TableHead>Handoff status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {gaps.map((gap) => (
            <TableRow key={gap.id}>
              <TableCell className="font-medium">{gap.student.visibleId ?? "—"}</TableCell>
              <TableCell>{gap.student.school?.schoolName ?? "—"}</TableCell>
              <TableCell>{gap.fellow.fellowName ?? "—"}</TableCell>
              <TableCell className="text-sm text-shamiri-text-grey">
                {gap.createdAt.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>
                <DaysCell days={gap.daysSince} />
              </TableCell>
              <TableCell>
                {gap.referredSupervisor?.supervisorName ? (
                  <span className="text-sm">{gap.referredSupervisor.supervisorName}</span>
                ) : (
                  <Badge variant="outline" className="text-shamiri-text-grey">
                    Unassigned
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <HandoffCell status={gap.supervisorHandoffStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-2">
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
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b px-4 py-3 last:border-0">
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
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-6 py-10">
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
          <GapTable />
        </Suspense>
      </div>
      <PageFooter />
    </div>
  );
}
