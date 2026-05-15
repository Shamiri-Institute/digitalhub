"use client";

import { useState } from "react";
import { createClinicalCaseFromTriage } from "#/app/(platform)/sc/triage/action";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Create clinical case</DialogTitle>
          <p className="text-sm text-shamiri-text-grey">
            Enter a pseudonym to identify this student anonymously in the clinical case.
          </p>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="pseudonym" className="text-sm">
            Pseudonym (required)
          </Label>
          <Input
            id="pseudonym"
            placeholder="e.g. Blue Lion"
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            maxLength={50}
          />
        </div>
        <DialogFooter className="flex justify-end gap-2 pt-2">
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
