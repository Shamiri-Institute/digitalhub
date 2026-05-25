"use client";

import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

interface PdfViewerProps {
  url: string;
  fileName?: string;
  fileType?: string;
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export default function PdfViewer({
  url,
  fileName,
  fileType = "pdf",
  className,
  onClose,
  showCloseButton = true,
}: PdfViewerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <DocViewer
        documents={[
          {
            uri: url,
            fileName: fileName ?? "document.pdf",
            fileType,
          },
        ]}
        pluginRenderers={DocViewerRenderers}
        prefetchMethod="GET"
        config={{ header: { disableHeader: false } }}
        className="h-[500px] rounded-lg border border-shamiri-light-grey"
      />
      {showCloseButton && onClose && (
        <Button variant="outline" size="sm" onClick={onClose} className="w-full">
          Close Viewer
        </Button>
      )}
    </div>
  );
}
