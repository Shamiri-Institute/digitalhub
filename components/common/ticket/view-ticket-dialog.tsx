"use client";

import { format } from "date-fns";
import { Suspense, use } from "react";
import { LoadErrorBoundary } from "#/components/common/load-error-boundary";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { getEscalationsPerTicket, getTicketChanges } from "#/lib/actions/ticket";
import type { TicketChange } from "#/lib/actions/ticket/types";
import type { TicketData } from "./columns";
import { enumLabel } from "#/lib/utils";

const formatSafeDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
};

export function ViewTicketDialog({
  ticket,
  escalations,
  changes,
  onOpenChange,
}: {
  ticket: TicketData;
  escalations: ReturnType<typeof getEscalationsPerTicket>;
  changes: ReturnType<typeof getTicketChanges>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.ticket className="h-5 w-5 text-shamiri-new-blue" />
            <span className="text-xl">Ticket Details</span>
          </DialogTitle>
          <DialogDescription>View ticket details and escalation history</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium text-shamiri-text-grey uppercase">Subject</div>
            <div className="text-base">{ticket.subject}</div>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium text-shamiri-text-grey uppercase">Description</div>
            <div className="text-base">{ticket.description || "No description provided"}</div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">Category</div>
              <div className="text-base capitalize">{ticket.category.toLowerCase()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">Priority</div>
              <div className="text-base capitalize">{ticket.priority.toLowerCase()}</div>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">Status</div>
              <div className="text-base capitalize">{enumLabel(ticket.status)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">
                Current Tier
              </div>
              <div className="text-base capitalize">
                {ticket.currentTier ? enumLabel(ticket.currentTier) : "No escalation"}
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium text-shamiri-text-grey uppercase">Created</div>
            <div className="text-base">{format(new Date(ticket.createdAt), "dd MMM yyyy")}</div>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium text-shamiri-text-grey uppercase mb-3">
              Escalation History
            </div>
            <LoadErrorBoundary message="Could not load the escalations.">
              <Suspense
                fallback={
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                }
              >
                <EscalationHistory escalations={escalations} />
              </Suspense>
            </LoadErrorBoundary>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium text-shamiri-text-grey uppercase mb-3">Changes</div>
            <LoadErrorBoundary message="Could not load the changes.">
              <Suspense fallback={<Skeleton className="h-16 w-full" />}>
                <ChangeHistory changes={changes} />
              </Suspense>
            </LoadErrorBoundary>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EscalationHistory({
  escalations: escalationsPromise,
}: {
  escalations: ReturnType<typeof getEscalationsPerTicket>;
}) {
  const result = use(escalationsPromise);
  const escalations = result.data ?? [];
  if (!result.success || escalations.length === 0) {
    return <div className="text-sm text-shamiri-text-grey">No escalations</div>;
  }

  return (
    <div className="relative">
      <div className="absolute left-[18px] top-3 h-[calc(100%-24px)] w-1 bg-shamiri-new-blue/30 rounded-full" />
      <div className="space-y-4">
        {[...escalations].reverse().map((escalation, index) => {
          const stepNumber = escalations.length - index;
          return (
            <div key={escalation.id} className="relative flex gap-3 pl-10">
              <div className="absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-shamiri-new-blue text-white text-xs font-semibold z-10">
                {stepNumber}
              </div>
              <div className="flex-1 rounded-md border border-shamiri-light-grey bg-background p-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-row items-center justify-center gap-2 sm:gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="default" className="text-xs">
                        {escalation.escalatedByRole?.toLowerCase() ?? "unknown"}
                      </Badge>
                      <span className="text-xs sm:text-sm font-medium">
                        {escalation.escalatedByName ?? "Unknown"}
                      </span>
                    </div>
                    <Icons.chevronRight className="h-4 w-4 text-shamiri-new-blue shrink-0" />
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {escalation.escalatedToRole?.toLowerCase() ?? "unknown"}
                      </Badge>
                      <span className="text-xs sm:text-sm font-medium">
                        {escalation.escalatedToName ?? "Unknown"}
                      </span>
                    </div>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-shamiri-text-grey uppercase">Reason</span>
                    <span className="text-sm text-shamiri-text-dark-grey">
                      {escalation.escalationReason}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-shamiri-text-grey uppercase">Date</span>
                    <span className="text-sm">{formatSafeDate(escalation.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function describeChange(change: TicketChange) {
  switch (change.kind) {
    case "PRIORITY_CHANGED":
      return `Priority changed from ${enumLabel(change.fromValue ?? "")} to ${enumLabel(change.toValue ?? "")}`;
    case "REOPENED":
      return "Reopened";
    case "CANCELLED":
      return "Cancelled";
  }
}

function ChangeHistory({
  changes: changesPromise,
}: {
  changes: ReturnType<typeof getTicketChanges>;
}) {
  const result = use(changesPromise);
  const changes = result.data ?? [];
  if (!result.success || changes.length === 0) {
    return <div className="text-sm text-shamiri-text-grey">No changes</div>;
  }

  return (
    <div className="space-y-3">
      {[...changes].reverse().map((change) => (
        <div
          key={change.id}
          className="rounded-md border border-shamiri-light-grey bg-background p-3"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">{describeChange(change)}</span>
            <span className="text-xs text-shamiri-text-grey">
              {change.actorName ?? "Unknown"} · {formatSafeDate(change.createdAt)}
            </span>
            <span className="text-sm text-shamiri-text-dark-grey">{change.reason}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
