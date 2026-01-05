"use client";

import { useState } from "react";
import { triggerCaseStatusToFollowup } from "#/app/(platform)/sc/clinical/action";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";

interface TriggerFollowupDialogProps {
  children: React.ReactNode;
  caseId: string;
}

export default function TriggerFollowupDialog({ children, caseId }: TriggerFollowupDialogProps) {
  const [open, setDialogOpen] = useState<boolean>(false);

  const handleConfirm = async () => {
    try {
      const response = await triggerCaseStatusToFollowup({ caseId });
      if (response.success) {
        toast({
          title: "Case status updated to follow up",
        });
        setDialogOpen(false);
      } else {
        toast({
          title: "Failed to update case status",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Failed to update case status",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trigger Follow Up</DialogTitle>
          <DialogDescription>
            Are you sure you want to change the case status to follow up?
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="brand" onClick={handleConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
