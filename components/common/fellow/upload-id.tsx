import type React from "react";
import type { Dispatch, SetStateAction } from "react";
import type { MainFellowTableData } from "#/app/(platform)/hc/fellows/components/columns";
import DialogAlertWidget from "#/components/common/dialog-alert-widget";
import FellowFilesUploader from "#/components/common/fellow/file-uploader";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";

export default function UploadFellowID({
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
  if (!fellow) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="w-2/5 max-w-none">
        <DialogHeader>
          <span className="text-xl">Upload ID or Bith Certificate</span>
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
        <FellowFilesUploader fellow={fellow} onClose={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
