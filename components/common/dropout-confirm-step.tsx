import { InfoIcon } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle, useDialogSave } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

export type StepProps<Step> = {
  step: Step;
  setStep: (step: Step) => void;
  close: () => void;
};

/**
 * The step of a dialog that goes through a form and a confirmation before it writes. Every close
 * starts the next open at the first step; `DialogContent` keeps the dialog open while the write is
 * in flight.
 */
export function useStepsDialog<Step>(firstStep: Step, setOpen: (open: boolean) => void) {
  const [step, setStep] = useState(firstStep);
  function close() {
    setStep(firstStep);
    setOpen(false);
  }
  function onOpenChange(open: boolean) {
    if (open) {
      setOpen(true);
    } else {
      close();
    }
  }
  const stepProps: StepProps<Step> = { step, setStep, close };
  return { onOpenChange, stepProps };
}

export function DropoutConfirmStep({
  children,
  onCancel,
  onConfirm,
}: {
  children: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { isSaving } = useDialogSave();
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
          disabled={isSaving}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="destructive"
          disabled={isSaving}
          loading={isSaving}
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </DialogFooter>
    </>
  );
}
