import type React from "react";
import type { Dispatch, SetStateAction } from "react";
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
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 text-base leading-6 font-medium">
        <UnarchiveGroupConfirm groupId={groupId} close={() => onOpenChange(false)}>
          {children}
        </UnarchiveGroupConfirm>
      </DialogContent>
    </Dialog>
  );
}

function UnarchiveGroupConfirm({
  groupId,
  children,
  close,
}: {
  groupId: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const { isSaving, save } = useDialogSave();

  const onConfirm = () => {
    save(async () => {
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
      close();
    });
  };

  return (
    <>
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
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="brand"
            disabled={isSaving}
            loading={isSaving}
            onClick={onConfirm}
          >
            Unarchive
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
