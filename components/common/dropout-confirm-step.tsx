import { InfoIcon } from "lucide-react";
import type React from "react";
import { type TransitionStartFunction, useState, useTransition } from "react";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

export type StepProps<Step> = {
  step: Step;
  setStep: (step: Step) => void;
  close: () => void;
  isPending: boolean;
  startTransition: TransitionStartFunction;
};

/**
 * The state of a dialog that steps through a form and a confirmation before it writes. The write
 * runs in `startTransition`, and while it is in flight the dialog does not close: closing would
 * hide its outcome, and the row behind it still shows the old state, so a reopen could send the
 * write again. `close` itself always closes, for the write to call once it succeeds.
 */
export function useStepsDialog<Step>(firstStep: Step, setOpen: (open: boolean) => void) {
  const [step, setStep] = useState(firstStep);
  const [isPending, startTransition] = useTransition();
  function close() {
    setStep(firstStep);
    setOpen(false);
  }
  function onOpenChange(open: boolean) {
    if (open) {
      setOpen(true);
    } else if (!isPending) {
      close();
    }
  }
  const stepProps: StepProps<Step> = { step, setStep, close, isPending, startTransition };
  return { onOpenChange, stepProps };
}

export function DropoutConfirmStep({
  children,
  isPending,
  onCancel,
  onConfirm,
}: {
  children: React.ReactNode;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg font-bold">Confirm drop out</DialogTitle>
      </DialogHeader>
      {children}
      <div className="space-y-4">
        <h3>Are you sure?</h3>
        <Alert variant="destructive">
          <AlertTitle className="flex gap-2">
            <InfoIcon className="h-4 w-4 shrink-0" />
            Once this change has been made it is irreversible and will need you to contact support
            in order to modify. Please be sure of your action before you confirm.
          </AlertTitle>
        </Alert>
      </div>
      <Separator />
      <DialogFooter className="flex justify-end">
        <Button
          className="text-shamiri-light-red hover:bg-red-bg"
          variant="ghost"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={isPending}
          loading={isPending}
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </DialogFooter>
    </>
  );
}
