"use client";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { revalidatePageAction, undoDropoutSchool } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  async function undoDropout() {
    setLoading(true);
    if (school) {
      const response = await undoDropoutSchool(school.id);
      if (!response.success) {
        toast({
          description: response.message ?? "Something went wrong, please try again",
        });
        setLoading(false);
        return;
      }

      toast({ description: response.message });
      await revalidatePageAction(pathname);
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-5 text-base font-medium leading-6">
        <DialogHeader>
          <DialogTitle>Undo school dropout?</DialogTitle>
        </DialogHeader>
        <DialogAlertWidget label={school?.schoolName} />
        <DialogFooter className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            onClick={() => {
              undoDropout();
            }}
          >
            Undo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
