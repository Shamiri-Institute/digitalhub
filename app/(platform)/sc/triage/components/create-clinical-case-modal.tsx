"use client";

import { useState } from "react";
import { createClinicalCaseFromTriage } from "#/app/(platform)/sc/triage/action";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useDialogSave,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";

export default function CreateClinicalCaseModal({
  triageEventId,
  isOpen,
  onClose,
}: {
  triageEventId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gap-0 p-0 max-w-md">
        <CreateClinicalCaseForm triageEventId={triageEventId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function CreateClinicalCaseForm({
  triageEventId,
  onClose,
}: {
  triageEventId: string;
  onClose: () => void;
}) {
  const [pseudonym, setPseudonym] = useState("");
  const { isSaving, save } = useDialogSave();

  const handleSubmit = () => {
    if (!pseudonym.trim()) return;
    save(async () => {
      try {
        await createClinicalCaseFromTriage(triageEventId, pseudonym);
        toast({ description: "Clinical case created." });
        onClose();
      } catch (err) {
        toast({
          variant: "destructive",
          description: (err as Error)?.message ?? "Failed to create case.",
        });
      }
    });
  };

  return (
    <>
      <DialogHeader className="space-y-0 px-6 py-4">
        <DialogTitle className="text-base font-medium">Create clinical case</DialogTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a pseudonym to identify this student anonymously in the clinical case.
        </p>
      </DialogHeader>
      <Separator />
      <div className="my-6 space-y-6">
        <div className="px-6">
          <Label htmlFor="pseudonym" className="text-sm">
            Pseudonym (required)
          </Label>
          <Input
            id="pseudonym"
            placeholder="e.g. Blue Lion"
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            maxLength={50}
            className="mt-1.5"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 px-6 pb-6">
        <DialogClose
          render={
            <Button type="button" variant="ghost" className="text-primary hover:bg-info-bg">
              Cancel
            </Button>
          }
        />
        <Button type="button" disabled={!pseudonym.trim() || isSaving} onClick={handleSubmit}>
          {isSaving ? "Creating…" : "Create case"}
        </Button>
      </div>
    </>
  );
}
