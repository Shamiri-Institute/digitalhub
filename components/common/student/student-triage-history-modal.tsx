"use client";

import { useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { getStudentTriageHistory } from "#/lib/actions/triage";

type HistoryEvent = Awaited<ReturnType<typeof getStudentTriageHistory>>[number];

const RISK_LABELS: Record<string, { label: string; className: string }> = {
  ALL_NO: { label: "Risk negative", className: "bg-green-bg text-green-base border-green-border" },
  ANY_YES: { label: "Risk positive", className: "bg-red-bg text-red-base border-red-border" },
  NOT_COMPLETED: { label: "Not completed", className: "" },
};

const ACTION_LABELS: Record<string, string> = {
  SUPPORTED: "Provided peer counselling",
  REFERRED: "Referred to supervisor",
  ESCALATED: "Escalated to supervisor",
  REFUSED: "Student refused referral",
  INTERRUPTED: "Interaction interrupted",
};

const HISTORY_SKELETONS = ["h1", "h2", "h3"];

const HANDOFF_LABELS: Record<string, string> = {
  WARM_HANDOFF: "Warm handoff",
  SUPERVISOR_NOTIFIED: "Supervisor notified",
  COULD_NOT_REACH: "Could not reach",
  STUDENT_REFUSED_NOTIFIED: "Student refused (supervisor notified)",
};

function HistoryRow({ event }: { event: HistoryEvent }) {
  const sessionLabel =
    event.session.session?.sessionLabel ??
    event.session.sessionName ??
    event.session.sessionType ??
    "—";
  const riskConfig = event.riskScreenOutcome ? RISK_LABELS[event.riskScreenOutcome] : null;

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{sessionLabel}</span>
        <span className="text-xs text-shamiri-text-grey">
          {event.session.sessionDate
            ? new Date(event.session.sessionDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {riskConfig && (
          <Badge variant="outline" className={riskConfig.className}>
            {riskConfig.label}
          </Badge>
        )}
        {event.actionTaken && (
          <span className="text-xs text-shamiri-text-grey">
            {ACTION_LABELS[event.actionTaken] ?? event.actionTaken}
          </span>
        )}
      </div>
      {event.supervisorHandoffStatus && (
        <p className="text-xs text-shamiri-text-grey">
          Handoff: {HANDOFF_LABELS[event.supervisorHandoffStatus] ?? event.supervisorHandoffStatus}
        </p>
      )}
      {event.note && (
        <p className="text-xs text-shamiri-text-grey italic">&ldquo;{event.note}&rdquo;</p>
      )}
    </div>
  );
}

export default function StudentTriageHistoryModal({
  isOpen,
  onClose,
  studentId,
  studentName,
}: {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string | null;
}) {
  const [history, setHistory] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId) return;
    setLoading(true);
    void getStudentTriageHistory(studentId)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [isOpen, studentId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Student triage history</DialogTitle>
          {studentName && (
            <p className="text-sm text-shamiri-text-grey capitalize">{studentName.toLowerCase()}</p>
          )}
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {loading && (
            <div>
              {HISTORY_SKELETONS.map((id) => (
                <div key={id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          )}
          {!loading && history.length === 0 && (
            <p className="py-6 text-center text-sm text-shamiri-text-grey">
              No triage history for this student in your sessions.
            </p>
          )}
          {!loading && history.map((event) => <HistoryRow key={event.id} event={event} />)}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
