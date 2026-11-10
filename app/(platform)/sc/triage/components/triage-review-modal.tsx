"use client";

import { useState } from "react";
import { markTriageReviewed } from "#/app/(platform)/sc/triage/action";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useDialogSave,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { Textarea } from "#/components/ui/textarea";
import { toast } from "#/components/ui/use-toast";

export default function TriageReviewModal({
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
      <DialogContent className="max-w-md gap-0 p-0">
        <TriageReviewForm triageEventId={triageEventId} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}

function TriageReviewForm({
  triageEventId,
  onClose,
}: {
  triageEventId: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const { isSaving, save } = useDialogSave();

  const handleSubmit = () => {
    if (!note.trim()) return;
    save(async () => {
      try {
        const response = await markTriageReviewed(triageEventId, note.trim());
        toast({
          variant: response.success ? undefined : "destructive",
          description: response.message,
        });
        onClose();
      } catch {
        toast({
          variant: "destructive",
          description: "Failed to save review. Please try again.",
        });
      }
    });
  };

  return (
    <>
      <DialogHeader className="space-y-0 px-6 py-4">
        <DialogTitle className="text-base font-medium">
          Mark reviewed — no clinical case needed
        </DialogTitle>
        <p className="text-muted-foreground mt-1 text-sm">
          Record your reason for closing this escalation without opening a clinical case. This note
          is visible to the Clinical Lead.
        </p>
      </DialogHeader>
      <Separator />
      <div className="my-6 space-y-6">
        <div className="space-y-1 px-6">
          <Textarea
            placeholder="e.g. Assessed student — risk screen was precautionary, no clinical concern identified."
            className="resize-none"
            rows={4}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">{note.length}/300</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 px-6 pb-6">
        <DialogClose asChild>
          <Button type="button" variant="ghost" className="text-primary hover:bg-info-bg">
            Cancel
          </Button>
        </DialogClose>
        <Button type="button" disabled={!note.trim() || isSaving} onClick={handleSubmit}>
          {isSaving ? "Saving…" : "Confirm review"}
        </Button>
      </div>
    </>
  );
}
