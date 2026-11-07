"use client";

import { useState } from "react";
import { Badge } from "#/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { DISPLAY_DATE } from "#/lib/date-utils";
import { format } from "date-fns";

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
}

export function ViewTerminationReasons({
  children,
  termination,
  pseudonym,
}: ViewTerminationReasonsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
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
                <div className="mt-1 rounded-md bg-background-secondary p-3">
                  <p className="whitespace-pre-wrap text-sm">
                    {termination.terminationReasonExplanation}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Date Created: {format(new Date(termination.createdAt), DISPLAY_DATE)}</span>
                <span>
                  Termination Date: {format(new Date(termination.terminationDate), DISPLAY_DATE)}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
