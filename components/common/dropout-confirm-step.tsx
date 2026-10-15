import { InfoIcon } from "lucide-react";
import type React from "react";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";

export type StepProps<Step> = {
  step: Step;
  setStep: (step: Step) => void;
  close: () => void;
};

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
