"use client";

import { useState } from "react";
import { unterminateClinicalCase } from "#/app/(platform)/sc/clinical/action";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTrigger } from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";

export default function CaseUnterminateDialog({
  children,
  caseId,
  pseudonym,
}: {
  children: React.ReactNode;
  caseId: string;
  pseudonym: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const onConfirmSubmit = async () => {
    setLoading(true);
    try {
      const response = await unterminateClinicalCase({ caseId });
      if (response.success) {
        toast({ title: "Case un-terminated successfully" });
        setOpen(false);
      } else {
        toast({
          title: "Something went wrong, please try again",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Something went wrong, please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-1/3 max-w-none">
        <DialogHeader>
          <span className="text-xl font-bold">Un-terminate case - {pseudonym}</span>
        </DialogHeader>
        <div className="flex flex-col gap-y-4">
          <Separator />
          <span>Are you sure?</span>
          <div className="flex gap-2 rounded-lg border border-shamiri-red/30 bg-red-bg px-4 py-2 text-red-base">
            <Icons.info className="mt-1 h-4 w-4 shrink-0 stroke-2" />
            <div>
              This will restore the case to Active status and remove the existing termination
              record. Please be sure of your action before you confirm.
            </div>
          </div>
        </div>
        <Separator />
        <div className="flex justify-end gap-4">
          <Button
            className="text-shamiri-light-red hover:bg-red-bg hover:text-shamiri-light-red"
            variant="ghost"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={loading}
            loading={loading}
            onClick={() => {
              void onConfirmSubmit();
            }}
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
