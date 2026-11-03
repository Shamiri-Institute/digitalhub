// Reads printed PDFs back the way a scanner and a person would, for the print tests.
import { createCanvas } from "@napi-rs/canvas";
import jsQR from "jsqr";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export async function pageTexts(bytes: Uint8Array) {
  const pdf = await getDocument({ data: bytes.slice() }).promise;
  const texts: string[] = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    const content = await (await pdf.getPage(number)).getTextContent();
    texts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return texts;
}

/**
 * What a scanner reads from each page's QR code in one band of the page, drawn at 300 dpi: the top
 * or bottom quarter, as if the rest of the page were torn off. Null where it finds none.
 */
export async function decodedQrCodes(bytes: Uint8Array, band: "top" | "bottom") {
  const pdf = await getDocument({ data: bytes.slice() }).promise;
  const decoded: (string | null)[] = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const viewport = page.getViewport({ scale: 300 / 72 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: context as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    const bandHeight = Math.round(canvas.height / 4);
    const top = band === "top" ? 0 : canvas.height - bandHeight;
    const image = context.getImageData(0, top, canvas.width, bandHeight);
    decoded.push(jsQR(image.data, image.width, image.height)?.data ?? null);
  }
  return decoded;
}
