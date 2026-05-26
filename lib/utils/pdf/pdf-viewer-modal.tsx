"use client";

import { useEffect } from "react";
import { Icons } from "#/components/icons";
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
}: PdfViewerModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-2 md:px-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="sticky top-2 z-10 float-right mr-2 md:mr-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
        >
          <Icons.xIcon className="h-4 w-4" />
        </button>

        <div className="px-2 md:px-4 pb-2 md:pb-4">
          <PdfViewer url={url} showCloseButton={false} />
        </div>
      </div>
    </div>
  );
}
