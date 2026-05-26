"use client";

import { Icons } from "#/components/icons";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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

export default function PdfViewerModal({ open, onOpenChange, url, fileName }: PdfViewerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col rounded-lg border-0 bg-white p-0 shadow-xl [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">{fileName ?? "PDF Viewer"}</DialogTitle>
        <DialogDescription className="sr-only">
          View PDF document{fileName ? `: ${fileName}` : ""}
        </DialogDescription>
        <div className="sticky top-0 z-10 flex justify-end p-2 md:p-4">
          <DialogClose asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300"
            >
              <Icons.xIcon className="h-4 w-4" />
            </button>
          </DialogClose>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 md:px-4 pb-2 md:pb-4">
          <PdfViewer url={url} showCloseButton={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
