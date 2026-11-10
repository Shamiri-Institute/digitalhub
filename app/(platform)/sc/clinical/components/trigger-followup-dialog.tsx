"use client";

import { useState } from "react";
import { triggerCaseStatusToFollowup } from "#/app/(platform)/sc/clinical/action";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  useDialogSave,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";

interface TriggerFollowupDialogProps {
  children: React.ReactElement;
  caseId: string;
}

export default function TriggerFollowupDialog({ children, caseId }: TriggerFollowupDialogProps) {
  const [open, setDialogOpen] = useState<boolean>(false);

  return (
    <Dialog open={open} onOpenChange={setDialogOpen}>
      <DialogTrigger render={children} />
      <DialogContent>
        <TriggerFollowupConfirm caseId={caseId} close={() => setDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TriggerFollowupConfirm({ caseId, close }: { caseId: string; close: () => void }) {
  const { isSaving, save } = useDialogSave();

  const handleConfirm = () => {
    save(async () => {
      try {
        const response = await triggerCaseStatusToFollowup({ caseId });
        if (response.success) {
          toast({
            title: "Case status updated to follow up",
          });
          close();
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
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Trigger Follow Up</DialogTitle>
        <DialogDescription>
          Are you sure you want to change the case status to follow up?
        </DialogDescription>
      </DialogHeader>
      <Separator />
      <DialogFooter>
        <DialogClose render={<Button variant="ghost">Cancel</Button>} />
        <Button disabled={isSaving} loading={isSaving} onClick={handleConfirm}>
          Confirm
        </Button>
      </DialogFooter>
    </>
  );
}
