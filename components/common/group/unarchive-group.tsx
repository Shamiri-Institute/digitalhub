import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { unarchiveInterventionGroup } from "#/lib/actions/group";
import { usePathname } from "next/navigation";
import type React from "react";
import { type Dispatch, type SetStateAction, useState } from "react";

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
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const onSubmit = async () => {
    setLoading(true);
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
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-5 text-base leading-6 font-medium">
        <DialogHeader>
          <h2 className="text-xl font-bold">Confirm group unarchive</h2>
        </DialogHeader>
        {children}
        <div className="space-y-4">
          <h3>Are you sure you want to restore this group? It will become active again.</h3>
        </div>
        <Separator />
        <div className="space-y-5">
          <DialogFooter className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="brand"
              type="submit"
              disabled={loading}
              loading={loading}
              onClick={() => {
                void onSubmit();
              }}
            >
              Unarchive
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
