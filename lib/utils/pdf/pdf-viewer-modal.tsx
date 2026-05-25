"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import PdfViewer from "#/lib/utils/pdf/pdf-viewer";

interface PdfViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  fileName?: string;
  fileType?: string;
}

export default function PdfViewerModal({
  open,
  onOpenChange,
  url,
  fileName,
  fileType = "pdf",
}: PdfViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden lg:w-4/5 lg:max-w-none">
        <DialogHeader>
          <DialogTitle>{fileName ?? "Document"}</DialogTitle>
          <DialogDescription>View the document below.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          <PdfViewer
            url={url}
            fileName={fileName}
            fileType={fileType}
            showCloseButton={false}
            className="h-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
