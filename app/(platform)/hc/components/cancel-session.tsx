import { CancelSessionContext } from "#/app/(platform)/hc/context/cancel-session-dialog-context";
import { SessionDetail } from "#/app/(platform)/hc/schedule/_components/session-list";
import { cancelSession } from "#/app/(platform)/hc/schedule/actions/session";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogPortal,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { useContext } from "react";

export default function CancelSession({
  updateSessionsState,
}: {
  updateSessionsState: () => void;
}) {
  const context = useContext(CancelSessionContext);
  async function cancelSelectedSession() {
    if (context.session) {
      const response = await cancelSession(context.session?.id);
      if (response.success) {
        updateSessionsState();
        context.setIsOpen(false);
        toast({
          description: response.message,
        });
      } else {
        toast({
          description: response.error,
        });
      }
    }
  }

  return (
    <div>
      <Dialog
        open={context.isOpen}
        onOpenChange={context.setIsOpen}
        modal={true}
      >
        <DialogPortal>
          <DialogContent className="w-1/3 max-w-none">
            <DialogHeader>
              <span className="text-xl font-bold">Cancel session</span>
            </DialogHeader>
            {context.session && (
              <SessionDetail
                session={context.session}
                layout={"compact"}
                withDropdown={false}
              />
            )}
            <div className="flex flex-col gap-y-4">
              <Separator />
              <span>Are you sure?</span>
              <div className="flex gap-2 rounded-lg border border-shamiri-red/30 bg-red-bg px-4 py-2 text-red-base">
                <Icons.info className="-mt-1 h-8 w-8 stroke-2" />
                <div>
                  Once this change has been made it is irreversible and will
                  need you to contact support in order to modify. Please be sure
                  of your action before you confirm.
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex justify-end gap-4">
              <Button
                className="text-shamiri-light-red hover:bg-red-bg hover:text-shamiri-light-red"
                variant="ghost"
                onClick={() => {
                  context.setIsOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  await cancelSelectedSession();
                }}
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
}
