"use client";

import type { ImplementerRole } from "@prisma/client";
import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useContext, useState } from "react";
import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import { SessionsContext } from "#/components/common/session/sessions-provider";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogPortal } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { cancelSession } from "#/lib/actions/session/session";

export default function CancelSession({
  sessionId,
  open,
  onOpenChange,
  role: _role,
  children,
}: {
  sessionId: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  role: ImplementerRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { refresh } = useContext(SessionsContext);
  const [loading, setLoading] = useState<boolean>(false);

  async function cancelSelectedSession() {
    setLoading(true);
    const response = await cancelSession(sessionId);
    if (!response.success) {
      onOpenChange(false);
      toast({
        variant: "destructive",
        description: response.message ?? "Something went wrong while trying to reschedule session.",
      });
      setLoading(false);
      return;
    }

    await Promise.all([revalidatePageAction(pathname), refresh()]);
    toast({
      description: response.message,
    });
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        <DialogPortal>
          <DialogContent className="lg:w-1/3 lg:max-w-none">
            <DialogHeader>
              <span className="text-xl font-bold">Cancel session</span>
            </DialogHeader>
            {children}
            <div className="flex flex-col gap-y-4">
              <Separator />
              <span>Are you sure?</span>
              <div className="flex items-start gap-2 rounded-lg border border-shamiri-red/30 bg-red-bg px-4 py-2 text-red-base">
                <Icons.info className="h-4 w-4 shrink-0 stroke-2" />
                <div>
                  Once this change has been made it is irreversible and will need you to contact
                  support in order to modify. Please be sure of your action before you confirm.
                </div>
              </div>
            </div>
            <Separator />
            <div className="flex justify-end gap-4">
              <Button
                className="text-shamiri-light-red hover:bg-red-bg hover:text-shamiri-light-red"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                loading={loading}
                disabled={loading}
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
