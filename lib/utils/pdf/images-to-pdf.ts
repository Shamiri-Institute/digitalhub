import { PDFDocument } from "pdf-lib";
import type { ScaledImagePosition } from "#/lib/utils/pdf/types";
import { A4_HEIGHT_PTS, A4_MARGIN_PTS, A4_WIDTH_PTS } from "#/lib/utils/pdf/types";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

function calculateA4Fit(imgW: number, imgH: number): ScaledImagePosition {
  const maxW = A4_WIDTH_PTS - 2 * A4_MARGIN_PTS;
  const maxH = A4_HEIGHT_PTS - 2 * A4_MARGIN_PTS;

  const scale = Math.min(maxW / imgW, maxH / imgH, 1);

  const width = imgW * scale;
  const height = imgH * scale;
  const x = (A4_WIDTH_PTS - width) / 2;
  const y = (A4_HEIGHT_PTS - height) / 2;

  return { width, height, x, y };
}

async function embedImage(pdfDoc: PDFDocument, img: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get 2d rendering context");
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92),
  );
  if (!blob) throw new Error("Failed to export canvas as JPEG");
  return pdfDoc.embedJpg(await blob.arrayBuffer());
}

export async function imagesToPdf(images: File[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();

  for (const image of images) {
    const img = await loadImage(image);
    const embedded = await embedImage(pdfDoc, img);
    const { width, height, x, y } = calculateA4Fit(img.naturalWidth, img.naturalHeight);

    const page = pdfDoc.addPage([A4_WIDTH_PTS, A4_HEIGHT_PTS]);
    page.drawImage(embedded, { x, y, width, height });
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}

export async function appendToPdf(existingPdfBytes: ArrayBuffer, newImages: File[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  for (const image of newImages) {
    const img = await loadImage(image);
    const embedded = await embedImage(pdfDoc, img);
    const { width, height, x, y } = calculateA4Fit(img.naturalWidth, img.naturalHeight);

    const page = pdfDoc.addPage([A4_WIDTH_PTS, A4_HEIGHT_PTS]);
    page.drawImage(embedded, { x, y, width, height });
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
}
