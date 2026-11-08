import type React from "react";
import { type Dispatch, type SetStateAction, useTransition } from "react";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast, toastOnFailure } from "#/components/ui/use-toast";
import { unarchiveInterventionGroup } from "#/lib/actions/group";

export default function UnarchiveGroup({
  groupId,
  children,
  open,
  onOpenChange,
}: {
  groupId: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) {
  const [isPending, startTransition] = useTransition();
  // An unarchive in flight keeps the dialog open until it finishes.
  const close = () => !isPending && onOpenChange(false);

  const onConfirm = () => {
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await unarchiveInterventionGroup(groupId);
        if (!response.success) {
          toast({
            description: response.message ?? "Something went wrong, please try again",
          });
          return;
        }
        toast({
          description: response.message,
        });
        onOpenChange(false);
      }),
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent closeDisabled={isPending} className="p-5 text-base leading-6 font-medium">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Confirm group unarchive</DialogTitle>
        </DialogHeader>
        {children}
        <div className="space-y-4 pt-2">
          <h3>Are you sure?</h3>
          <DialogAlertWidget
            label="This group will become active again and can be used for interventions."
            variant="destructive"
            separator={false}
          />
        </div>
        <Separator />
        <div className="space-y-6 pt-2">
          <DialogFooter className="flex justify-end">
            <Button type="button" variant="ghost" disabled={isPending} onClick={close}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={isPending}
              loading={isPending}
              onClick={onConfirm}
            >
              Unarchive
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
