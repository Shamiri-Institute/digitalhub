import { usePathname } from "next/navigation";
import type React from "react";
import { type Dispatch, type SetStateAction, useState } from "react";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
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
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onConfirm = async () => {
    setIsSubmitting(true);
    try {
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
      await revalidatePageAction(pathname);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 text-base leading-6 font-medium">
        <DialogHeader>
          <h2 className="text-xl font-bold">Confirm group unarchive</h2>
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={isSubmitting}
              loading={isSubmitting}
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
