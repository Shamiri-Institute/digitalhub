"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Icons } from "#/components/icons";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

interface PdfViewerInnerProps {
  url: string;
  className?: string;
}

export default function PdfViewerInner({ url, className }: PdfViewerInnerProps) {
  const [numPages, setNumPages] = useState<number>();
  const [pageWidth, setPageWidth] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const updateWidth = () => {
      if (contentRef.current) {
        setPageWidth(contentRef.current.clientWidth);
      }
    };
    requestAnimationFrame(updateWidth);
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const pages = Array.from(new Array(numPages), (_, i) => (
    <Page
      key={i}
      pageNumber={i + 1}
      width={pageWidth || undefined}
      renderTextLayer={false}
      renderAnnotationLayer={false}
    />
  ));

  return (
    <div ref={contentRef} className={className}>
      <Document
        file={url}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={() => setLoadError(true)}
        loading={
          <div className="flex flex-col items-center justify-center py-16 text-shamiri-text-grey">
            <Icons.loaderCircle className="h-10 w-10 mb-4 animate-spin" />
            <p>Loading PDF...</p>
            <p className="text-sm mt-1">This may take a moment on slower connections.</p>
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center py-16 text-shamiri-light-red">
            <p className="text-lg font-medium">Failed to load PDF</p>
            <p className="text-sm mt-1 text-shamiri-text-grey">
              Check the file path and try again.
            </p>
          </div>
        }
      >
        {loadError ? null : pages}
      </Document>
    </div>
  );
}
