"use client";

import type { TriageEventForSupervisor } from "#/app/(platform)/sc/triage/action";
import { Badge } from "#/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

const RISK_NOT_COMPLETED_LABELS: Record<string, string> = {
  STUDENT_LEFT: "Student left",
  NO_PRIVACY: "No privacy",
  TIME_CONSTRAINTS: "Time constraints",
  OTHER: "Other",
};

const ACTION_LABELS: Record<string, string> = {
  SUPPORTED: "Supported",
  REFERRED: "Referred",
  ESCALATED: "Escalated",
  REFUSED: "Refused",
  INTERRUPTED: "Interrupted",
};

const HANDOFF_LABELS: Record<string, string> = {
  WARM_HANDOFF: "Warm handoff",
  SUPERVISOR_NOTIFIED: "Supervisor notified",
  COULD_NOT_REACH: "Could not reach",
  STUDENT_REFUSED_NOTIFIED: "Student refused to be notified",
};

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 px-6 py-2">
      <span className="text-shamiri-text-grey text-sm">{label}</span>
      <span className="col-span-2 text-sm">{children}</span>
    </div>
  );
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

export default function TriageDetailsModal({
  event,
  isOpen,
  onClose,
}: {
  event: TriageEventForSupervisor;
  isOpen: boolean;
  onClose: () => void;
}) {
  const sessionLabel =
    event.session.session?.sessionLabel ??
    event.session.sessionName ??
    event.session.sessionType ??
    "—";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg gap-0 p-0">
        <DialogHeader className="space-y-0 px-6 py-4">
          <DialogTitle className="text-base font-medium capitalize">
            {event.student.studentName?.toLowerCase() ?? event.student.visibleId ?? "Triage event"}
          </DialogTitle>
          <p className="text-shamiri-text-grey mt-1 text-sm">
            Triage detail recorded by {event.fellow.fellowName ?? "the fellow"}.
          </p>
        </DialogHeader>
        <Separator />
        <div className="max-h-[70vh] overflow-y-auto py-4">
          <DetailRow label="Student">
            <span className="capitalize">{event.student.studentName?.toLowerCase() ?? "—"}</span>
            {event.student.visibleId && (
              <span className="text-shamiri-text-grey ml-1">· {event.student.visibleId}</span>
            )}
          </DetailRow>
          <DetailRow label="School">{event.student.school?.schoolName ?? "—"}</DetailRow>
          <DetailRow label="Fellow">{event.fellow.fellowName ?? "—"}</DetailRow>
          <DetailRow label="Session">
            {sessionLabel}
            {event.session.sessionDate && (
              <span className="text-shamiri-text-grey ml-1">
                · {formatDate(event.session.sessionDate)}
              </span>
            )}
          </DetailRow>

          <Separator className="my-2" />

          <DetailRow label="Triage occurred">{event.triageOccurred ? "Yes" : "No"}</DetailRow>
          <DetailRow label="Risk outcome">
            <RiskBadge outcome={event.riskScreenOutcome} />
          </DetailRow>
          {event.riskScreenOutcome === "NOT_COMPLETED" && event.riskNotCompletedReason && (
            <DetailRow label="Reason not completed">
              {RISK_NOT_COMPLETED_LABELS[event.riskNotCompletedReason] ??
                event.riskNotCompletedReason}
            </DetailRow>
          )}
          <DetailRow label="Action taken">
            {event.actionTaken ? (ACTION_LABELS[event.actionTaken] ?? event.actionTaken) : "—"}
          </DetailRow>
          <DetailRow label="Handoff">
            {event.supervisorHandoffStatus
              ? (HANDOFF_LABELS[event.supervisorHandoffStatus] ?? event.supervisorHandoffStatus)
              : "—"}
          </DetailRow>
          <DetailRow label="Referred to">
            {event.referredSupervisor?.supervisorName ?? "—"}
          </DetailRow>
          <DetailRow label="Clinical case">
            {event.clinicalCaseExists ? (
              <Badge className="bg-green-bg text-green-base border-green-border">Open</Badge>
            ) : (
              <Badge variant="outline" className="text-shamiri-text-grey">
                None
              </Badge>
            )}
          </DetailRow>

          <Separator className="my-2" />

          <DetailRow label="Fellow's note">
            {event.note ? (
              <span className="whitespace-pre-wrap">{event.note}</span>
            ) : (
              <span className="text-shamiri-text-grey">No note recorded.</span>
            )}
          </DetailRow>

          {event.reviewedAt && (
            <>
              <Separator className="my-2" />
              <DetailRow label="Reviewed by">{event.reviewedBy?.name ?? "—"}</DetailRow>
              <DetailRow label="Reviewed on">{formatDate(event.reviewedAt)}</DetailRow>
              <DetailRow label="Review note">
                {event.reviewNote ? (
                  <span className="whitespace-pre-wrap">{event.reviewNote}</span>
                ) : (
                  <span className="text-shamiri-text-grey">No review note.</span>
                )}
              </DetailRow>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
