"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { getTicketResolution } from "#/lib/actions/ticket";
import type { TicketResolution } from "#/lib/actions/ticket/types";
import type { TicketData } from "./columns";

const formatSafeDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
};

export function ViewResolutionDialog({
  ticket,
  open,
  onOpenChange,
}: {
  ticket: TicketData | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [resolution, setResolution] = useState<TicketResolution | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ticket?.id) return;

    const fetchResolution = async () => {
      setLoading(true);
      const result = await getTicketResolution(ticket.id);
      if (result.success) {
        setResolution(result.data ?? null);
      } else {
        setResolution(null);
      }
      setLoading(false);
    };

    void fetchResolution();
  }, [open, ticket?.id]);

  if (!ticket) return null;

  const isResolved = ticket.status === "RESOLVED";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Resolution Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        ) : isResolved && resolution ? (
          <div className="space-y-4">
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">
                Resolved By
              </div>
              <div className="text-base capitalize">
                {resolution.resolvedByRole
                  ? resolution.resolvedByRole.toLowerCase().replace("_", " ")
                  : "Unknown"}
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">
                Resolution Reason
              </div>
              <div className="text-base">{resolution.resolutionReason}</div>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">
                Date Resolved
              </div>
              <div className="text-base">{formatSafeDate(resolution.createdAt)}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-blue-bg border border-blue-border p-4">
              <p className="text-sm text-blue-base font-medium">
                {ticket.currentTier
                  ? `This ticket has been escalated to ${ticket.currentTier.toLowerCase().replace("_", " ")} for resolution. It has not yet been resolved.`
                  : "This ticket has not yet been resolved."}
              </p>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">Subject</div>
              <div className="text-base">{ticket.subject}</div>
            </div>
            <Separator />
            <div>
              <div className="text-sm font-medium text-shamiri-text-grey uppercase">
                Description
              </div>
              <div className="text-base">{ticket.description || "No description provided"}</div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
