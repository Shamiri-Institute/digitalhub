"use client";

import { useState } from "react";
import { createClinicalCaseFromTriage } from "#/app/(platform)/sc/triage/action";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
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
  const [pseudonym, setPseudonym] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!pseudonym.trim()) return;
    setSubmitting(true);
    try {
      await createClinicalCaseFromTriage(triageEventId, pseudonym);
      toast({ description: "Clinical case created." });
      setPseudonym("");
      onClose();
    } catch (err) {
      toast({
        variant: "destructive",
        description: (err as Error)?.message ?? "Failed to create case.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gap-0 p-0 max-w-md">
        <DialogHeader className="space-y-0 px-6 py-4">
          <DialogTitle className="text-base font-medium">Create clinical case</DialogTitle>
          <p className="mt-1 text-sm text-shamiri-text-grey">
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
          <Button
            type="button"
            variant="ghost"
            className="text-shamiri-new-blue hover:bg-blue-bg"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!pseudonym.trim() || submitting} onClick={handleSubmit}>
            {submitting ? "Creating…" : "Create case"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
