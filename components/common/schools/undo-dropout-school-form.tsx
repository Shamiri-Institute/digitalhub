"use client";
import { undoDropoutSchool } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useDialogSave,
} from "#/components/ui/dialog";
import { toast } from "#/components/ui/use-toast";
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
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-5 text-base font-medium leading-6">
        <UndoDropoutSchoolConfirm school={school} close={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function UndoDropoutSchoolConfirm({
  school,
  close,
}: {
  school: SchoolsTableData | null;
  close: () => void;
}) {
  const { isSaving, save } = useDialogSave();
  function undoDropout() {
    if (!school) return;
    save(async () => {
      const response = await undoDropoutSchool(school.id);
      if (!response.success) {
        toast({
          description: response.message ?? "Something went wrong, please try again",
        });
        return;
      }

      toast({ description: response.message });
      close();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Undo school dropout?</DialogTitle>
      </DialogHeader>
      <DialogAlertWidget label={school?.schoolName} />
      <DialogFooter className="flex justify-end">
        <DialogClose asChild>
          <Button variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={isSaving} loading={isSaving} onClick={undoDropout}>
          Undo
        </Button>
      </DialogFooter>
    </>
  );
}
