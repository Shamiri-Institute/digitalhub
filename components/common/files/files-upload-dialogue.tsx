import type React from "react";
import type { Dispatch, SetStateAction } from "react";
import SchoolFilesUploader from "#/components/common/files/upload-file";
import { Dialog, DialogContent, DialogHeader } from "#/components/ui/dialog";

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
      <DialogContent className="lg:w-2/5 lg:max-w-none">
        <DialogHeader>
          <span className="text-xl">Upload file</span>
        </DialogHeader>
        <SchoolFilesUploader schoolId={schoolId} onClose={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
