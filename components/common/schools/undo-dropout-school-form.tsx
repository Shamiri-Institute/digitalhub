"use client";
import { useTransition } from "react";
import { undoDropoutSchool } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { toast, toastOnFailure } from "#/components/ui/use-toast";
import type { SchoolsTableData } from "./columns";

export function UndoDropoutSchool({
  school,
  open,
  setOpen,
}: {
  school: SchoolsTableData | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  // An undo in flight keeps the dialog open until it finishes.
  const close = () => !isPending && setOpen(false);
  function undoDropout() {
    if (!school) return;
    startTransition(() =>
      toastOnFailure(async () => {
        const response = await undoDropoutSchool(school.id);
        if (!response.success) {
          toast({
            description: response.message ?? "Something went wrong, please try again",
          });
          return;
        }

        toast({ description: response.message });
        setOpen(false);
      }),
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent closeDisabled={isPending} className="p-5 text-base font-medium leading-6">
        <DialogHeader>
          <DialogTitle>Undo school dropout?</DialogTitle>
        </DialogHeader>
        <DialogAlertWidget label={school?.schoolName} />
        <DialogFooter className="flex justify-end">
          <Button variant="ghost" disabled={isPending} onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} loading={isPending} onClick={undoDropout}>
            Undo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
