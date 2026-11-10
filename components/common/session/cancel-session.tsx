"use client";

import type { Dispatch, SetStateAction } from "react";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  useDialogSave,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { cancelSession } from "#/lib/actions/session/session";

export default function CancelSession({
  sessionId,
  open,
  onOpenChange,
  children,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        <DialogContent className="lg:w-1/3 lg:max-w-none">
          <CancelSessionConfirm sessionId={sessionId} close={() => onOpenChange(false)}>
            {children}
          </CancelSessionConfirm>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CancelSessionConfirm({
  sessionId,
  close,
  children,
}: {
  sessionId: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const { isSaving, save } = useDialogSave();

  function cancelSelectedSession() {
    save(async () => {
      const response = await cancelSession(sessionId);
      if (!response.success) {
        close();
        toast({
          variant: "destructive",
          description:
            response.message ?? "Something went wrong while trying to cancel the session.",
        });
        return;
      }

      toast({
        description: response.message,
      });
      close();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-bold">Cancel session</DialogTitle>
      </DialogHeader>
      {children}
      <div className="flex flex-col gap-y-4 pt-4">
        <span>Are you sure?</span>
        <div className="flex items-start gap-2 rounded-lg border border-destructive-border bg-destructive-bg px-4 py-2 text-destructive">
          <Icons.info className="h-4 w-4 shrink-0 stroke-2" />
          <div>
            Once this change has been made it is irreversible and will need you to contact support
            in order to modify. Please be sure of your action before you confirm.
          </div>
        </div>
      </div>
      <Separator />
      <div className="flex justify-end gap-4">
        <DialogClose
          render={
            <Button
              className="text-destructive hover:bg-destructive-bg hover:text-destructive"
              variant="ghost"
            >
              Cancel
            </Button>
          }
        />
        <Button
          variant="destructive"
          loading={isSaving}
          disabled={isSaving}
          onClick={cancelSelectedSession}
        >
          Confirm
        </Button>
      </div>
    </>
  );
}
