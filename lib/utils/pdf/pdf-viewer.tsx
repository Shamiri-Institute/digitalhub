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
    <div className={cn("h-full", className)}>
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
        config={{
          header: { disableHeader: true },
          pdfVerticalScrollByDefault: true,
        }}
        className="h-full min-h-[300px] rounded-lg border border-shamiri-light-grey"
      />
      {showCloseButton && onClose && (
        <Button variant="outline" size="sm" onClick={onClose} className="w-full">
          Close Viewer
        </Button>
      )}
    </div>
  );
}
