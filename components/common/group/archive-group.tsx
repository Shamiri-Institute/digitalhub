import { InfoIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import type React from "react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { Alert, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
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
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const onSubmit = async () => {
    setLoading(true);
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

    await revalidatePageAction(pathname);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 text-base font-medium leading-6">
        <DialogHeader>
          <h2 className="text-xl font-bold">Confirm group archive</h2>
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
            <Button
              className="text-shamiri-light-red"
              type={"button"}
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading}
              loading={loading}
              onClick={() => {
                void onSubmit();
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
