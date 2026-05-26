"use client";

import dynamic from "next/dynamic";
import { Icons } from "#/components/icons";

interface PdfViewerProps {
  url: string;
  fileName?: string;
  fileType?: string;
  className?: string;
  onClose?: () => void;
  showCloseButton?: boolean;
}

const PdfViewerInner = dynamic(() => import("./pdf-viewer-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center py-16 text-shamiri-text-grey">
      <Icons.loaderCircle className="h-10 w-10 mb-4 animate-spin" />
      <p>Loading PDF viewer...</p>
    </div>
  ),
});

export default function PdfViewer({ url, className }: PdfViewerProps) {
  return <PdfViewerInner key={url} url={url} className={className} />;
}
