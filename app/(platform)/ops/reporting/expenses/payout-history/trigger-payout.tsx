"use client";
import { useState } from "react";
import { triggerPayoutAction } from "#/app/(platform)/ops/reporting/expenses/payout-history/actions";
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

export default function TriggerPayout() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const response = await triggerPayoutAction();
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
    <div className="container flex w-full grow justify-end space-y-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>Manually Trigger Payout</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Payout Trigger</DialogTitle>
            <DialogDescription>
              This action will initiate the payout process for all pending payments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Please be aware that this action:</p>
            <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
              <li>Cannot be reversed once initiated</li>
              <li>Will process all eligible pending payments</li>
              <li>May take some time to complete</li>
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading}
              loading={loading}
            >
              Confirm Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
