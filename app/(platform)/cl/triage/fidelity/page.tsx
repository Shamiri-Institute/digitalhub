import { Suspense } from "react";
import { getTriageFidelityData } from "#/app/(platform)/cl/triage/fidelity/action";
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

function FlagCell({
  value,
  flag,
  suffix = "%",
}: {
  value: number;
  flag: boolean;
  suffix?: string;
}) {
  return (
    <span className={cn("text-sm", flag && "font-semibold text-shamiri-light-red")}>
      {value}
      {suffix}
      {flag && " ⚠"}
    </span>
  );
}

async function FidelityTable() {
  const rows = await getTriageFidelityData();

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-shamiri-text-grey">No fellows assigned to this hub yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fellow</TableHead>
            <TableHead>Supervisor</TableHead>
            <TableHead>Schools</TableHead>
            <TableHead className="text-right">Sessions</TableHead>
            <TableHead className="text-right">Triage events</TableHead>
            <TableHead className="text-right">Triage rate</TableHead>
            <TableHead className="text-right">Risk positive</TableHead>
            <TableHead className="text-right">Escalation compliance</TableHead>
            <TableHead className="text-right">Screen completion</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.fellowId}>
              <TableCell className="font-medium">{row.fellowName}</TableCell>
              <TableCell className="text-shamiri-text-grey">{row.supervisorName}</TableCell>
              <TableCell className="text-sm text-shamiri-text-grey max-w-[160px] truncate">
                {row.schools}
              </TableCell>
              <TableCell className="text-right text-sm">{row.sessionsAttended}</TableCell>
              <TableCell className="text-right text-sm">{row.triageEvents}</TableCell>
              <TableCell className="text-right">
                <FlagCell value={row.triageRate} flag={row.triageRateFlag} />
              </TableCell>
              <TableCell className="text-right text-sm">{row.riskPositive}</TableCell>
              <TableCell className="text-right">
                <FlagCell value={row.escalationCompliance} flag={row.complianceFlag} />
              </TableCell>
              <TableCell className="text-right text-sm">{row.screenCompletionRate}%</TableCell>
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
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
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
    <div className="flex h-full flex-col">
      <div className="container w-full grow space-y-6 py-10">
        <div>
          <PageHeading title="Triage fidelity" />
          <p className="mt-1 text-sm text-shamiri-text-grey">
            Per-fellow triage completion and quality metrics. Flagged values (⚠) fall outside
            expected ranges — triage rate &lt;10% or &gt;80%, escalation compliance &lt;95%.
          </p>
        </div>
        <Separator />
        <Suspense fallback={<TableSkeleton />}>
          <FidelityTable />
        </Suspense>
      </div>
      <PageFooter />
    </div>
  );
}
