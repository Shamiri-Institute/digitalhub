// Paints printed copies of a survey version from its layout into one PDF. It measures nothing and
// moves nothing: every run and box is drawn where the layout puts it.

import fontkit from "@pdf-lib/fontkit";
import { degrees, LineCapStyle, PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";

import {
  type CopyValues,
  type Drawable,
  type FontWeight,
  headerValueRun,
  type Layout,
  pageCodeRun,
  type TextRun,
} from "#/lib/survey/layout";
import type { PrintFonts } from "#/lib/survey/print-fonts";
import { qrOperators } from "#/lib/survey/print-qr";
import { CAP_HEIGHT, measure } from "#/lib/survey/text-metrics";

const BLACK = rgb(0, 0, 0);
const WATERMARK_RED = rgb(0.86, 0.15, 0.15);

/** One printed copy: its header values, and for each page of the layout what identifies it. */
export type PrintedCopy<L extends Layout> = {
  values: CopyValues<L["prefill"]>;
  /** In page order. The QR code holds `id`; `code` prints under it. */
  pages: { id: string; code: string }[];
};

/**
 * One A4 page per layout page for each copy, copies in order. A `watermark` is printed across
 * every page, over the form, so a preview can't pass for a copy to hand out and scan.
 *
 * Everything every copy shares (the form, the markers, the header labels, the watermark) is
 * drawn once per layout page and placed on each copy's page as a template. Drawn again on every
 * page, it took about 140 KB of memory per page, too much for a 1,000-copy file.
 */
export async function renderCopiesPdf<L extends Layout>(
  layout: L,
  copies: PrintedCopy<L>[],
  fonts: PrintFonts,
  { watermark }: { watermark?: string } = {},
): Promise<Uint8Array> {
  const { width, height } = layout.paper;
  const doc = await PDFDocument.create();
  const font = await embedPrintFonts(doc, fonts);
  const templates = await doc.embedPdf(
    await renderTemplates(layout, fonts, watermark),
    layout.pages.map((_, index) => index),
  );

  const text = (page: PDFPage, run: TextRun) =>
    page.drawText(run.text, {
      x: run.x,
      y: height - run.baseline,
      size: run.size,
      font: font[run.weight],
      color: BLACK,
    });

  for (const copy of copies) {
    layout.pages.forEach((laid, index) => {
      const printedPage = copy.pages[index];
      const template = templates[index];
      if (!printedPage || !template) {
        throw new Error(`Copy ${copy.values.serial} has no page ${index + 1}`);
      }
      const page = doc.addPage([width, height]);
      page.drawPage(template);
      for (const slot of laid.header) {
        text(page, headerValueRun(slot, copy.values));
      }
      text(page, pageCodeRun(laid.qr, printedPage.code));
      page.node.addContentStream(
        doc.context.register(doc.context.flateStream(qrOperators(printedPage.id, laid.qr, height))),
      );
    });
  }
  return doc.save();
}

/** Each layout page's shared ink as one page of its own PDF, for `renderCopiesPdf` to place. */
async function renderTemplates(layout: Layout, fonts: PrintFonts, watermark: string | undefined) {
  const doc = await PDFDocument.create();
  const font = await embedPrintFonts(doc, fonts);
  const { width, height } = layout.paper;
  // PDF pages measure up from the bottom; the layout measures down from the top.
  const flip = (y: number) => height - y;

  const text = (page: PDFPage, run: TextRun) =>
    page.drawText(run.text, {
      x: run.x,
      y: flip(run.baseline),
      size: run.size,
      font: font[run.weight],
      color: BLACK,
    });

  const draw = (page: PDFPage, drawable: Drawable) => {
    switch (drawable.kind) {
      case "text":
        text(page, drawable.run);
        return;
      case "rect": {
        const { x, y, w, h } = drawable.rect;
        page.drawRectangle({
          x,
          y: flip(y + h),
          width: w,
          height: h,
          borderWidth: drawable.stroke,
          borderColor: BLACK,
        });
        return;
      }
      case "circle":
        page.drawCircle({
          x: drawable.cx,
          y: flip(drawable.cy),
          size: drawable.r,
          borderWidth: drawable.stroke,
          borderColor: BLACK,
        });
        return;
      case "line":
        page.drawLine({
          start: { x: drawable.x1, y: flip(drawable.y1) },
          end: { x: drawable.x2, y: flip(drawable.y2) },
          thickness: drawable.stroke,
          color: BLACK,
          ...(drawable.dotted && { dashArray: [0.1, 2.5], lineCap: LineCapStyle.Round }),
        });
        return;
    }
  };

  const watermarkOver = (page: PDFPage, mark: string) => {
    // Along the page's diagonal, centred, at 60% of its length.
    const angle = Math.atan2(height, width);
    const size = (0.6 * Math.hypot(width, height)) / measure(mark, 700, 1);
    const markWidth = measure(mark, 700, size);
    const capHeight = CAP_HEIGHT * size;
    page.drawText(mark, {
      x: width / 2 - (Math.cos(angle) * markWidth - Math.sin(angle) * capHeight) / 2,
      y: height / 2 - (Math.sin(angle) * markWidth + Math.cos(angle) * capHeight) / 2,
      size,
      font: font[700],
      color: WATERMARK_RED,
      opacity: 0.25,
      rotate: degrees((angle * 180) / Math.PI),
    });
  };

  for (const laid of layout.pages) {
    const page = doc.addPage([width, height]);
    for (const marker of Object.values(laid.markers)) {
      page.drawRectangle({
        x: marker.x,
        y: flip(marker.y + marker.h),
        width: marker.w,
        height: marker.h,
        color: BLACK,
      });
    }
    for (const slot of laid.header) {
      text(page, slot.label);
    }
    for (const drawable of laid.content) {
      draw(page, drawable);
    }
    if (watermark) {
      watermarkOver(page, watermark);
    }
  }
  return doc.save();
}

async function embedPrintFonts(
  doc: PDFDocument,
  fonts: PrintFonts,
): Promise<Record<FontWeight, PDFFont>> {
  doc.registerFontkit(fontkit);
  // Kerning and ligatures off, so each run is exactly as wide as the layout measured it.
  // Subsetting is off because pdf-lib's subsetter drops glyphs from some fonts.
  const embed = (weight: FontWeight) =>
    doc.embedFont(fonts[weight], {
      subset: false,
      features: { kern: false, liga: false, clig: false, calt: false },
    });
  const [regular, semibold, bold] = await Promise.all([embed(400), embed(600), embed(700)]);
  return { 400: regular, 600: semibold, 700: bold };
}
