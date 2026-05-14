import { Suspense } from "react";
import { getHandoffQualityData } from "#/app/(platform)/cl/triage/handoffs/action";
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

function CountPctCell({
  count,
  pct,
  flag = false,
}: {
  count: number;
  pct: number;
  flag?: boolean;
}) {
  return (
    <span className={cn("text-sm", flag && "font-semibold text-shamiri-light-red")}>
      {count} ({pct}%){flag && " ⚠"}
    </span>
  );
}

async function HandoffTable() {
  const rows = await getHandoffQualityData();

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-shamiri-text-grey">
          No escalation or referral events recorded in this hub yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supervisor</TableHead>
            <TableHead className="text-right">Total escalations</TableHead>
            <TableHead className="text-right">Warm handoff</TableHead>
            <TableHead className="text-right">Supervisor notified</TableHead>
            <TableHead className="text-right">Could not reach</TableHead>
            <TableHead className="text-right">Student refused</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.supervisorId}>
              <TableCell className="font-medium">{row.supervisorName}</TableCell>
              <TableCell className="text-right text-sm">{row.total}</TableCell>
              <TableCell className="text-right">
                <CountPctCell count={row.warmHandoff} pct={row.warmHandoffPct} />
              </TableCell>
              <TableCell className="text-right">
                <CountPctCell count={row.notified} pct={row.notifiedPct} />
              </TableCell>
              <TableCell className="text-right">
                <CountPctCell
                  count={row.couldNotReach}
                  pct={row.couldNotReachPct}
                  flag={row.couldNotReachFlag}
                />
              </TableCell>
              <TableCell className="text-right">
                <CountPctCell count={row.refused} pct={row.refusedPct} />
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
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b px-4 py-3 last:border-0">
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
          <HandoffTable />
        </Suspense>
      </div>
    </div>
  );
}
