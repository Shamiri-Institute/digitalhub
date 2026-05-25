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
      <DialogContent className="max-w-[900px] overflow-hidden">
        <DialogHeader>
          <DialogTitle>{fileName ?? "Document"}</DialogTitle>
          <DialogDescription>View the document below.</DialogDescription>
        </DialogHeader>
        <PdfViewer url={url} fileName={fileName} fileType={fileType} showCloseButton={false} />
      </DialogContent>
    </Dialog>
  );
}
