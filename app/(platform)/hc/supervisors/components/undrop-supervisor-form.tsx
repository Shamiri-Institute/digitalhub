import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useState } from "react";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { undropSupervisor } from "#/app/(platform)/hc/supervisors/actions";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { toast } from "#/components/ui/use-toast";

export default function UndropSupervisor({
  supervisorId,
  children,
  undropDialog,
  setUndropDialog,
}: {
  supervisorId?: string;
  children: React.ReactNode;
  undropDialog: boolean;
  setUndropDialog: Dispatch<SetStateAction<boolean>>;
}) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const onSubmit = async () => {
    if (supervisorId) {
      setLoading(true);
      const response = await undropSupervisor(supervisorId);
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
      setUndropDialog(false);
    }
  };

  return (
    <Dialog open={undropDialog} onOpenChange={setUndropDialog}>
      <DialogContent className="p-5 text-base font-medium leading-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Undo drop out supervisor?</DialogTitle>
        </DialogHeader>
        {children}
        <div className="space-y-5">
          <DialogFooter className="flex justify-end">
            <Button
              className="text-shamiri-new-blue"
              type={"button"}
              variant="ghost"
              onClick={() => {
                setUndropDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              onClick={() => {
                void onSubmit();
              }}
            >
              Undo
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
