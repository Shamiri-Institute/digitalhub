"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
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
import { getEscalationsPerTicket } from "#/lib/actions/ticket";
import type { TicketEscalation } from "#/lib/actions/ticket/types";
import type { TicketData } from "./columns";

const formatSafeDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
};

export function ViewTicketDialog({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: TicketData | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [escalations, setEscalations] = useState<TicketEscalation[]>([]);
  const [loadingEscalations, setLoadingEscalations] = useState(false);

  useEffect(() => {
    if (!open || !ticket?.id) return;

    const fetchEscalations = async () => {
      setLoadingEscalations(true);
      const result = await getEscalationsPerTicket(ticket.id);
      if (result.success && result.data) {
        setEscalations(result.data);
      }
      setLoadingEscalations(false);
    };

    void fetchEscalations();
  }, [open, ticket?.id]);

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <div className="text-base capitalize">{ticket.status.toLowerCase()}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">
                Current Tier
              </div>
              <div className="text-base capitalize">
                {ticket.currentTier
                  ? ticket.currentTier.toLowerCase().replace("_", " ")
                  : "No escalation"}
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
            {loadingEscalations ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : escalations.length === 0 ? (
              <div className="text-sm text-shamiri-text-grey">No escalations</div>
            ) : (
              <div className="relative">
                <div className="absolute left-[18px] top-3 h-[calc(100%-24px)] w-1 bg-shamiri-new-blue/30 rounded-full" />
                <div className="space-y-4">
                  {[...escalations].reverse().map((escalation, index) => {
                    const stepNumber = escalations.length - index;
                    return (
                      <div key={escalation.id} className="relative flex gap-3 pl-10">
                        <div className="absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-shamiri-new-blue text-white text-xs font-bold z-10">
                          {stepNumber}
                        </div>
                        <div className="flex-1 rounded-md border border-shamiri-light-grey bg-background p-3">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-row items-center justify-center gap-2 sm:gap-3">
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="default" className="text-xs">
                                  {escalation.escalatedBy.role.toLowerCase()}
                                </Badge>
                                <span className="text-xs sm:text-sm font-medium">
                                  {escalation.escalatedBy.name ?? "Unknown"}
                                </span>
                              </div>
                              <Icons.chevronRight className="h-4 w-4 text-shamiri-new-blue shrink-0" />
                              <div className="flex flex-col items-center gap-1">
                                <Badge variant="outline" className="text-xs">
                                  {escalation.escalatedTo.role.toLowerCase()}
                                </Badge>
                                <span className="text-xs sm:text-sm font-medium">
                                  {escalation.escalatedTo.name ?? "Unknown"}
                                </span>
                              </div>
                            </div>
                            <Separator className="my-1" />
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-shamiri-text-grey uppercase">
                                Reason
                              </span>
                              <span className="text-sm text-shamiri-text-dark-grey">
                                {escalation.escalationReason}
                              </span>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-shamiri-text-grey uppercase">Date</span>
                              <span className="text-sm">
                                {formatSafeDate(escalation.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
