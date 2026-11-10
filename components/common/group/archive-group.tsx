import { InfoIcon } from "lucide-react";
import type React from "react";
import type { Dispatch, SetStateAction } from "react";
import { Alert, AlertTitle } from "#/components/ui/alert";
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
import { archiveInterventionGroup } from "#/lib/actions/group";

export default function ArchiveGroup({
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
      <DialogContent className="p-5 text-base font-medium leading-6">
        <ArchiveGroupConfirm groupId={groupId} close={() => onOpenChange(false)}>
          {children}
        </ArchiveGroupConfirm>
      </DialogContent>
    </Dialog>
  );
}

function ArchiveGroupConfirm({
  groupId,
  children,
  close,
}: {
  groupId: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const { isSaving, save } = useDialogSave();

  const onSubmit = () => {
    save(async () => {
      const response = await archiveInterventionGroup(groupId);
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
        <DialogTitle className="text-xl font-bold">Confirm group archive</DialogTitle>
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
      <div className="space-y-5">
        <DialogFooter className="flex justify-end">
          <DialogClose asChild>
            <Button className="text-destructive" type="button" variant="ghost">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="submit"
            variant="destructive"
            disabled={isSaving}
            loading={isSaving}
            onClick={onSubmit}
          >
            Confirm
          </Button>
        </DialogFooter>
      </div>
    </>
  );
}
