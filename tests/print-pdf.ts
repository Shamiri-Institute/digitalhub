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

/** What a scanner reads from each page's QR code, from the page drawn at 300 dpi. */
export async function decodedQrCodes(bytes: Uint8Array) {
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
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    decoded.push(jsQR(image.data, image.width, image.height)?.data ?? null);
  }
  return decoded;
}
