"use client";

import { format } from "date-fns";
import { Suspense, use } from "react";
import { LoadErrorBoundary } from "#/components/common/load-error-boundary";
import { Icons } from "#/components/icons";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { Skeleton } from "#/components/ui/skeleton";
import { getTicketReassignments } from "#/lib/actions/ticket";

const formatSafeDate = (date: Date | string | null | undefined) => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return Number.isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
};

const formatRole = (role: string | null) =>
  role ? role.toLowerCase().replace("_", " ") : "unknown";

export function ViewReassignmentDialog({
  reassignments,
  onOpenChange,
}: {
  reassignments: ReturnType<typeof getTicketReassignments>;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            Reassignment History
          </DialogTitle>
        </DialogHeader>

        <LoadErrorBoundary message="Could not load the reassignment history.">
          <Suspense
            fallback={
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            }
          >
            <ReassignmentHistory reassignments={reassignments} />
          </Suspense>
        </LoadErrorBoundary>

        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReassignmentHistory({
  reassignments: reassignmentsPromise,
}: {
  reassignments: ReturnType<typeof getTicketReassignments>;
}) {
  const result = use(reassignmentsPromise);
  const reassignments = result.data ?? [];
  if (result.success && reassignments.length > 0) {
    return (
      <div className="relative">
        <div className="absolute left-[18px] top-3 h-[calc(100%-24px)] w-1 bg-shamiri-new-blue/30 rounded-full" />
        <div className="space-y-4">
          {[...reassignments].reverse().map((reassignment, index) => {
            const stepNumber = reassignments.length - index;
            return (
              <div key={reassignment.id} className="relative flex gap-3 pl-10">
                <div className="absolute left-2 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-shamiri-new-blue text-white text-xs font-bold z-10">
                  {stepNumber}
                </div>
                <div className="flex-1 rounded-md border border-shamiri-light-grey bg-background p-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-row items-center justify-center gap-2 sm:gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="default" className="text-xs">
                          {formatRole(reassignment.reassignedFromRole)}
                        </Badge>
                        <span className="text-xs sm:text-sm font-medium">
                          {reassignment.reassignedFromName || "Unknown"}
                        </span>
                      </div>
                      <Icons.chevronRight className="h-4 w-4 text-shamiri-new-blue shrink-0" />
                      <div className="flex flex-col items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {formatRole(reassignment.reassignedToRole)}
                        </Badge>
                        <span className="text-xs sm:text-sm font-medium">
                          {reassignment.reassignedToName || "Unknown"}
                        </span>
                      </div>
                    </div>
                    <Separator className="my-1" />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-shamiri-text-grey uppercase">Reason</span>
                      <span className="text-sm text-shamiri-text-dark-grey">
                        {reassignment.reassignmentReason}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-shamiri-text-grey uppercase">Date</span>
                      <span className="text-sm">{formatSafeDate(reassignment.createdAt)}</span>
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
  if (result.message.toLowerCase().includes("authorized")) {
    return (
      <div className="rounded-md bg-red-bg border border-red-border p-4">
        <p className="text-sm text-red-base font-medium">
          You are not authorized to view this ticket&apos;s reassignment history.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-md bg-blue-bg border border-blue-border p-4">
      <p className="text-sm text-blue-base font-medium">This ticket has not been reassigned yet.</p>
    </div>
  );
}
