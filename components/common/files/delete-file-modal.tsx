"use client";

import { revalidatePageAction } from "#/app/(platform)/hc/schools/actions";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import type { SchoolFilesTableData } from "#/components/common/files/columns";
import { Icons } from "#/components/icons";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from "#/components/ui/dialog";
import { Separator } from "#/components/ui/separator";
import { toast } from "#/components/ui/use-toast";
import { removeUploadedSchoolFile } from "#/lib/actions/file";
import { usePathname } from "next/navigation";
import type { Dispatch, SetStateAction } from "react";

export function RemoveUploadedFile({
  isOpen,
  setIsOpen,
  document,
}: {
  document: SchoolFilesTableData;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const pathname = usePathname();

  const handleRemoveFile = async () => {
    try {
      await removeUploadedSchoolFile(document.id);
      await revalidatePageAction(pathname);
      toast({
        variant: "default",
        title: "Success",
        description: `Successfully removed ${document.fileName}`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-2/5 max-w-none">
        <DialogHeader>
          <h2 className="text-lg font-bold">Confirm file removal</h2>
        </DialogHeader>
        <DialogAlertWidget>
          <div className="flex items-center gap-2">
            <span>{document.fileName}</span>
            <span className="h-1 w-1 rounded-full bg-shamiri-new-blue">
              {""}
            </span>
            <span>{document.type}</span>
          </div>
        </DialogAlertWidget>

        <p className="text-shamiri-black">Are you sure?</p>

        <div className="flex items-center space-x-2 rounded-xl border-2 border-shamiri-light-red-background-base/50 bg-shamiri-light-red-background-base/15 p-2 px-4">
          <Icons.info className="h-4 w-4 shrink-0 text-shamiri-light-red" />
          <p className="text-shamiri-light-red">
            Once this change has been made it is irreversible and will need you
            to contact support in order to modify. Please be sure of your action
            before you confirm.
          </p>
        </div>
        <Separator />
        <DialogFooter className="flex justify-end">
          <Button
            className="text-shamiri-light-red hover:bg-red-bg"
            variant="ghost"
            onClick={() => {
              setIsOpen(false);
            }}
            type="button"
          >
            Cancel
          </Button>
          <Button onClick={handleRemoveFile} variant="destructive">
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
