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
  qrPlaceholderRun,
  type Rect,
  type TextRun,
} from "#/lib/survey/layout";
import type { PrintFonts } from "#/lib/survey/print-fonts";
import { CAP_HEIGHT, measure } from "#/lib/survey/text-metrics";

const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.59, 0.59, 0.59);
const WATERMARK_RED = rgb(0.86, 0.15, 0.15);

/**
 * One A4 page per layout page for each copy, copies in order. A `watermark` is printed across
 * every page, over the form, so a preview can't pass for a copy to hand out and scan.
 */
export async function renderCopiesPdf<L extends Layout>(
  layout: L,
  copies: CopyValues<L["prefill"]>[],
  fonts: PrintFonts,
  { watermark }: { watermark?: string } = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // Kerning and ligatures off, so each run is exactly as wide as the layout measured it.
  // Subsetting is off because pdf-lib's subsetter drops glyphs from some fonts.
  const embed = (weight: FontWeight) =>
    doc.embedFont(fonts[weight], {
      subset: false,
      features: { kern: false, liga: false, clig: false, calt: false },
    });
  const [regular, semibold, bold] = await Promise.all([embed(400), embed(600), embed(700)]);
  const font: Record<FontWeight, PDFFont> = { 400: regular, 600: semibold, 700: bold };

  const { width, height } = layout.paper;
  // PDF pages measure up from the bottom; the layout measures down from the top.
  const flip = (y: number) => height - y;

  const text = (page: PDFPage, run: TextRun, color = BLACK) =>
    page.drawText(run.text, {
      x: run.x,
      y: flip(run.baseline),
      size: run.size,
      font: font[run.weight],
      color,
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

  // A placeholder until print runs give each page a code to encode.
  const qrPlaceholder = (page: PDFPage, qr: Rect) => {
    page.drawRectangle({
      x: qr.x,
      y: flip(qr.y + qr.h),
      width: qr.w,
      height: qr.h,
      borderWidth: 1,
      borderColor: GREY,
      borderDashArray: [3, 2],
    });
    text(page, qrPlaceholderRun(qr), GREY);
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

  for (const copy of copies) {
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
      qrPlaceholder(page, laid.qr);
      for (const slot of laid.header) {
        text(page, slot.label);
        text(page, headerValueRun(slot, copy));
      }
      for (const drawable of laid.content) {
        draw(page, drawable);
      }
      if (watermark) {
        watermarkOver(page, watermark);
      }
    }
  }
  return doc.save();
}
