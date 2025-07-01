"use client";

import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

interface TerminationData {
  id: string;
  createdAt: Date;
  terminationDate: Date;
  terminationReason: string;
  terminationReasonExplanation: string;
  sessionId: string;
}

interface ViewTerminationReasonsProps {
  children: React.ReactNode;
  termination: TerminationData | null;
  pseudonym: string;
  isTerminated: boolean;
}

export function ViewTerminationReasons({
  children,
  termination,
  pseudonym,
  isTerminated,
}: ViewTerminationReasonsProps) {
  const [open, setOpen] = useState(false);

  if (!isTerminated) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Termination Details - {pseudonym}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!termination ? (
            <div className="p-4 text-center text-muted-foreground">
              No termination details available.
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Termination Reason</p>
                <div className="mt-1">
                  <Badge variant="destructive">{termination.terminationReason}</Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium">Additional Information</p>
                <div className="mt-1 rounded-md bg-gray-50 p-3">
                  <p className="whitespace-pre-wrap text-sm">
                    {termination.terminationReasonExplanation}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Date Created: {new Date(termination.createdAt).toLocaleDateString()}</span>
                <span>
                  Termination Date: {new Date(termination.terminationDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
