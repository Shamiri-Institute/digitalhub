import { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import FellowFilesUploader from "#/app/(platform)/hc/fellows/components/file-uploader";
import DialogAlertWidget from "#/app/(platform)/hc/schools/components/dialog-alert-widget";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";
import { usePathname } from "next/navigation";
import React, { Dispatch, SetStateAction } from "react";

export default function UploadFellowQualification({
  fellow,
  open,
  onOpenChange,
  children,
}: {
  fellow?: MainFellowTableData;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();

  // revalidatePageAction(pathname).then(() => {
  //   toast({
  //     description: response.message,
  //   });
  //   onOpenChange(false);
  // });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="w-2/5 max-w-none">
        <DialogHeader>
          <span className="text-xl">
            Upload KCSE Certificate or Result Slip
          </span>
        </DialogHeader>
        {fellow && (
          <div className="pb-2 pt-4">
            <DialogAlertWidget separator={true}>
              <div className="flex items-center gap-2">
                <span>{fellow.fellowName}</span>
              </div>
            </DialogAlertWidget>
          </div>
        )}
        <FellowFilesUploader />
      </DialogContent>
    </Dialog>
  );
}
