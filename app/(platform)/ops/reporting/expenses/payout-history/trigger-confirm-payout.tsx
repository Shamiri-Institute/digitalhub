"use client";
import { confirmPayoutAction } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
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
import { useToast } from "#/components/ui/use-toast";
import { useState } from "react";

interface TriggerConfirmPayoutProps {
  dateAdded: Date;
  disabled?: boolean;
}

export default function TriggerConfirmPayout({ dateAdded, disabled }: TriggerConfirmPayoutProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const response = await confirmPayoutAction(dateAdded);
      if (response.success) {
        setOpen(false);
        toast({
          title: response.message,
        });
      } else {
        toast({
          title: response.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setLoading(false);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          {disabled ? "Confirmed" : "Confirm Payout"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Confirm Payout</DialogTitle>
          <DialogDescription>
            This action will confirm the payout for all processed payments on this date.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please be aware that this action:
          </p>
          <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
            <li>Cannot be reversed once confirmed</li>
            <li>Will confirm all processed payments for this date</li>
            <li>Will mark the payout as completed</li>
          </ul>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="brand"
            onClick={handleConfirm}
            disabled={loading}
            loading={loading}
          >
            Confirm Payout
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 