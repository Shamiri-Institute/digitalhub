"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { TriageEventForSupervisor } from "#/app/(platform)/sc/triage/action";
import { Badge } from "#/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils";

function RiskBadge({ outcome }: { outcome: string | null }) {
  if (outcome === "ANY_YES")
    return <Badge className="bg-red-bg text-red-base border-red-border">Risk +</Badge>;
  if (outcome === "ALL_NO")
    return <Badge className="bg-green-bg text-green-base border-green-border">Risk −</Badge>;
  return (
    <Badge variant="outline" className="text-shamiri-text-grey">
      Incomplete
    </Badge>
  );
}

const ACTION_LABELS: Record<string, string> = {
  SUPPORTED: "Supported",
  REFERRED: "Referred",
  ESCALATED: "Escalated",
  REFUSED: "Refused",
  INTERRUPTED: "Interrupted",
};

export default function FellowActivitySummaryRow({
  fellowName,
  supervisorId,
  events,
}: {
  fellowName: string;
  supervisorId: string;
  events: TriageEventForSupervisor[];
}) {
  const [expanded, setExpanded] = useState(false);

  const counts = events.reduce(
    (acc, e) => {
      const action = e.actionTaken ?? "UNKNOWN";
      acc[action] = (acc[action] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const referredToOthers = events.filter(
    (e) => e.referredSupervisorId && e.referredSupervisorId !== supervisorId,
  ).length;

  const completed = events.filter((e) => e.riskScreenOutcome !== "NOT_COMPLETED").length;
  const completionRate = events.length > 0 ? Math.round((completed / events.length) * 100) : null;

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded((v) => !v)}>
        <TableCell className="w-8">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-shamiri-text-grey" />
          ) : (
            <ChevronRight className="h-4 w-4 text-shamiri-text-grey" />
          )}
        </TableCell>
        <TableCell className="font-medium">{fellowName}</TableCell>
        <TableCell>{events.length}</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1 text-xs">
            {Object.entries(counts).map(([action, count]) => (
              <span key={action} className="text-shamiri-text-grey">
                {count} {ACTION_LABELS[action] ?? action}
              </span>
            ))}
          </div>
        </TableCell>
        <TableCell>
          {referredToOthers > 0 ? (
            <span className="font-medium text-shamiri-light-red">{referredToOthers}</span>
          ) : (
            <span className="text-shamiri-text-grey">0</span>
          )}
        </TableCell>
        <TableCell>
          {completionRate !== null ? (
            <span className={cn(completionRate < 80 && "text-shamiri-light-red font-medium")}>
              {completionRate}%
            </span>
          ) : (
            "—"
          )}
        </TableCell>
      </TableRow>

      {expanded &&
        events.map((e) => (
          <TableRow key={e.id} className="bg-gray-50/60 text-sm">
            <TableCell />
            <TableCell className="text-shamiri-text-grey">{e.student.visibleId ?? "—"}</TableCell>
            <TableCell>{e.student.school?.schoolName ?? "—"}</TableCell>
            <TableCell>
              {e.session.session?.sessionLabel ??
                e.session.sessionName ??
                e.session.sessionType ??
                "—"}
              {e.session.sessionDate && (
                <span className="ml-1 text-shamiri-text-grey">
                  ·{" "}
                  {new Date(e.session.sessionDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}
            </TableCell>
            <TableCell>
              <RiskBadge outcome={e.riskScreenOutcome} />
            </TableCell>
            <TableCell>{ACTION_LABELS[e.actionTaken ?? ""] ?? "—"}</TableCell>
            <TableCell>
              {e.referredSupervisor?.supervisorName ? (
                <span
                  className={cn(
                    e.referredSupervisorId !== supervisorId && "text-shamiri-text-grey",
                  )}
                >
                  {e.referredSupervisorId === supervisorId
                    ? "You"
                    : e.referredSupervisor.supervisorName}
                </span>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell>
              {e.clinicalCaseExists ? (
                <Badge className="bg-green-bg text-green-base border-green-border">Case open</Badge>
              ) : (
                <Badge variant="outline" className="text-shamiri-text-grey">
                  No case
                </Badge>
              )}
            </TableCell>
            <TableCell className="max-w-[200px] truncate text-shamiri-text-grey">
              {e.note ? (e.note.length > 80 ? `${e.note.slice(0, 80)}…` : e.note) : "—"}
            </TableCell>
          </TableRow>
        ))}
    </>
  );
}
