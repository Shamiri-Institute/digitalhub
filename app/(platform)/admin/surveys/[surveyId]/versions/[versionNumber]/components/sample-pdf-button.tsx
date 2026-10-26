"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";

import { Button } from "#/components/ui/button";
import { toast } from "#/components/ui/use-toast";
import { type Layout, sampleCopy } from "#/lib/survey/layout";
import { loadPrintFontsInBrowser } from "#/lib/survey/print-fonts";

interface SamplePdfButtonProps {
  layout: Layout;
  fileName: string;
  disabled: boolean;
}

/** Downloads one sample copy of every page as the PDF prints it, watermarked PREVIEW. */
export default function SamplePdfButton({ layout, fileName, disabled }: SamplePdfButtonProps) {
  const [rendering, setRendering] = useState(false);

  const handleDownload = async () => {
    setRendering(true);
    try {
      // Loaded on click, so pdf-lib and fontkit stay out of the builder's first load.
      const { renderCopiesPdf } = await import("#/lib/survey/print-pdf");
      const bytes = await renderCopiesPdf(
        layout,
        [sampleCopy(layout)],
        await loadPrintFontsInBrowser(),
        { watermark: "PREVIEW" },
      );
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Safari starts the download after the click returns, so the file must outlive it.
      setTimeout(() => URL.revokeObjectURL(url), 40_000);
    } catch {
      toast({ variant: "destructive", description: "Sorry, could not make the sample PDF." });
    } finally {
      setRendering(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      disabled={disabled || rendering}
      loading={rendering}
      onClick={() => void handleDownload()}
    >
      <FileDown className="h-4 w-4" />
      Sample PDF
    </Button>
  );
}
