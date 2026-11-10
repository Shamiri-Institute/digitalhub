"use client";

import { useState } from "react";
import { unterminateClinicalCase } from "#/app/(platform)/sc/clinical/action";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTrigger,
  DialogTitle,
  useDialogSave,
} from "#/components/ui/dialog";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";

export default function CaseUnterminateDialog({
  children,
  caseId,
  pseudonym,
}: {
  children: React.ReactNode;
  caseId: string;
  pseudonym: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-1/3 max-w-none">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Un-terminate case - {pseudonym}</DialogTitle>
        </DialogHeader>
        <CaseUnterminateForm caseId={caseId} close={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CaseUnterminateForm({ caseId, close }: { caseId: string; close: () => void }) {
  const { isSaving, save } = useDialogSave();
  const [reason, setReason] = useState("");

  const onConfirmSubmit = () => {
    save(async () => {
      const response = await unterminateClinicalCase({ caseId, reason });
      if (response.success) {
        toast({ title: "Case un-terminated successfully" });
        close();
      } else {
        toast({
          title: "Something went wrong, please try again",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <>
      <div className="flex flex-col gap-y-4">
        <Separator />
        <div className="flex gap-2 rounded-lg border border-destructive-border bg-destructive-bg px-4 py-2 text-destructive">
          <Icons.info className="mt-1 h-4 w-4 shrink-0 stroke-2" />
          <div>
            This will restore the case to Active status. The termination record stays in the case
            history.
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reopen-reason" required>
            Reason for reopening
          </Label>
          <Textarea
            id="reopen-reason"
            aria-required
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
          />
        </div>
      </div>
      <Separator />
      <div className="flex justify-end gap-4">
        <DialogClose asChild>
          <Button
            className="text-destructive hover:bg-destructive-bg hover:text-destructive"
            variant="ghost"
          >
            Cancel
          </Button>
        </DialogClose>
        <Button
          variant="destructive"
          disabled={isSaving || !reason.trim()}
          loading={isSaving}
          onClick={onConfirmSubmit}
        >
          Confirm
        </Button>
      </div>
    </>
  );
}
