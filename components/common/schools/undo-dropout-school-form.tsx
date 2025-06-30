"use client";
import { undoDropoutSchool } from "#/app/(platform)/hc/schools/actions";
import { SchoolInfoContext } from "#/app/(platform)/hc/schools/context/school-info-context";
import { SchoolsDataContext } from "#/app/(platform)/hc/schools/context/schools-data-context";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
import { toast } from "#/components/ui/use-toast";
import { useContext, useState } from "react";

export function UndoDropoutSchool() {
  const context = useContext(SchoolInfoContext);
  const schoolsContext = useContext(SchoolsDataContext);
  const [loading, setLoading] = useState(false);

  async function undoDropout() {
    setLoading(true);
    if (context.school) {
      const response = await undoDropoutSchool(context.school.id);
      if (!response.success) {
        toast({
          description: response.message ?? "Something went wrong, please try again",
        });
        setLoading(false);
        return;
      }

      const copiedSchools = [...schoolsContext.schools];
      const index = copiedSchools.findIndex((_school) => _school.id === context.school?.id);
      if (index !== -1) {
        copiedSchools[index]!.dropoutReason = response.data?.dropoutReason ?? null;
        copiedSchools[index]!.droppedOutAt = response.data?.droppedOutAt ?? null;
        copiedSchools[index]!.droppedOut = response.data?.droppedOut ?? false;
        schoolsContext.setSchools(copiedSchools);
      }
      toast({ description: response.message });
      setLoading(false);
      context.setUndoDropOutDialog(false);
    }
  }

  return (
    <Dialog open={context.undoDropOutDialog} onOpenChange={context.setUndoDropOutDialog}>
      <DialogContent className="p-5 text-base font-medium leading-6">
        <DialogHeader>
          <h2>Undo school dropout?</h2>
        </DialogHeader>
        <DialogAlertWidget label={context.school?.schoolName} />
        <DialogFooter className="flex justify-end">
          <Button
            variant="ghost"
            onClick={() => {
              context.setUndoDropOutDialog(false);
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
