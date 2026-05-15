"use client";

import { useState } from "react";
import { markTriageReviewed } from "#/app/(platform)/sc/triage/action";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";

export default function TriageReviewModal({
  triageEventId,
  studentId,
  isOpen,
  onClose,
}: {
  triageEventId: string;
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return;
    setSubmitting(true);
    try {
      await markTriageReviewed(triageEventId, note.trim());
      toast({ description: "Marked as reviewed — no case needed." });
      setNote("");
      onClose();
    } catch {
      toast({ variant: "destructive", description: "Failed to save review. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="gap-0 p-0 max-w-md">
        <DialogHeader className="space-y-0 px-6 py-4">
          <DialogTitle className="text-base font-medium">
            Mark reviewed — no clinical case needed
          </DialogTitle>
          <p className="mt-1 text-sm text-shamiri-text-grey">
            Record your reason for closing this escalation without opening a clinical case. This
            note is visible to the Clinical Lead.
          </p>
        </DialogHeader>
        <Separator />
        <div className="my-6 space-y-6">
          <div className="px-6 space-y-1">
            <Textarea
              placeholder="e.g. Assessed student — risk screen was precautionary, no clinical concern identified."
              className="resize-none"
              rows={4}
              maxLength={300}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-xs text-shamiri-text-grey">{note.length}/300</p>
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
          <Button type="button" disabled={!note.trim() || submitting} onClick={handleSubmit}>
            {submitting ? "Saving…" : "Confirm review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
