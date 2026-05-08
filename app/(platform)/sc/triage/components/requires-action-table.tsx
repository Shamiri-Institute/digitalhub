"use client";

import { useState } from "react";
import type { TriageEventForSupervisor } from "#/app/(platform)/sc/triage/action";
import TriageReviewModal from "#/app/(platform)/sc/triage/components/triage-review-modal";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { cn } from "#/lib/utils";

type RequiresActionEvent = TriageEventForSupervisor & { viewSection: "requires_action" };

function RiskBadge({ outcome }: { outcome: string | null }) {
  if (outcome === "ANY_YES")
    return <Badge className="bg-red-bg text-red-base border-red-border">Risk positive</Badge>;
  if (outcome === "ALL_NO")
    return <Badge className="bg-green-bg text-green-base border-green-border">Risk negative</Badge>;
  return (
    <Badge variant="outline" className="text-shamiri-text-grey">
      Not completed
    </Badge>
  );
}

function HandoffBadge({ status }: { status: string | null }) {
  const labels: Record<string, string> = {
    WARM_HANDOFF: "Warm handoff",
    SUPERVISOR_NOTIFIED: "Notified",
    COULD_NOT_REACH: "Could not reach",
    STUDENT_REFUSED_NOTIFIED: "Student refused",
  };
  return <span className="text-sm">{status ? (labels[status] ?? status) : "—"}</span>;
}

export default function RequiresActionTable({ events }: { events: RequiresActionEvent[] }) {
  const [reviewTarget, setReviewTarget] = useState<RequiresActionEvent | null>(null);

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-shamiri-text-grey">
          No unactioned escalations — all referrals have been reviewed or have open cases.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Fellow</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Risk outcome</TableHead>
              <TableHead>Handoff</TableHead>
              <TableHead>Days waiting</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.student.visibleId ?? "—"}</TableCell>
                <TableCell>{event.student.school?.schoolName ?? "—"}</TableCell>
                <TableCell>{event.fellow.fellowName ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  {event.session.session?.sessionLabel ??
                    event.session.sessionName ??
                    event.session.sessionType ??
                    "—"}
                  {event.session.sessionDate && (
                    <span className="ml-1 text-shamiri-text-grey">
                      ·{" "}
                      {new Date(event.session.sessionDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <RiskBadge outcome={event.riskScreenOutcome} />
                </TableCell>
                <TableCell>
                  <HandoffBadge status={event.supervisorHandoffStatus} />
                </TableCell>
                <TableCell>
                  <span
                    className={cn("text-sm font-medium", event.daysSince > 3 && "text-red-base")}
                  >
                    {event.daysSince}d
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="brand" asChild>
                      <a
                        href={`/sc/clinical/cases/new?studentId=${event.studentId}&schoolId=${event.student.schoolId ?? ""}&fromTriageId=${event.id}`}
                      >
                        Open case
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setReviewTarget(event)}>
                      Mark reviewed
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {reviewTarget && (
        <TriageReviewModal
          triageEventId={reviewTarget.id}
          studentId={reviewTarget.studentId}
          isOpen={true}
          onClose={() => setReviewTarget(null)}
        />
      )}
    </>
  );
}
