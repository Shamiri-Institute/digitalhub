import SchoolFilesUploader from "#/components/common/files/upload-file";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";
import React, { Dispatch, SetStateAction } from "react";

export default function UploadFileDialogue({
  schoolId,
  open,
  onOpenChange,
  children,
}: {
  schoolId: string;
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
  children?: React.ReactNode;
}) {
  if (!schoolId) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children}
      <DialogContent className="w-2/5 max-w-none">
        <DialogHeader>
          <span className="text-xl">Upload file</span>
        </DialogHeader>
        <SchoolFilesUploader schoolId={schoolId} onClose={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
