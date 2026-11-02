import { encode } from "uqr";

import type { Rect } from "#/lib/survey/layout";

const PAGE_ID_PREFIX = "surveyquestionnairepage_";

/**
 * What a page's QR codes hold: its id without the prefix every page id shares, in upper case. QR
 * codes store upper-case letters and digits compactly, so the code is version 2 (25 modules)
 * rather than version 4 (33) and fits the smaller footer box.
 */
export function pageQrText(pageId: string) {
  if (!pageId.startsWith(PAGE_ID_PREFIX)) {
    throw new Error(`${pageId} is not a questionnaire page id`);
  }
  return pageId.slice(PAGE_ID_PREFIX.length).toUpperCase();
}

/** The page id a scanned QR code names, or undefined for one that isn't a page's. */
export function pageIdFromQrText(text: string) {
  return /^[0-9A-Z]{26}$/.test(text) ? `${PAGE_ID_PREFIX}${text.toLowerCase()}` : undefined;
}

/**
 * The dark modules of `text`'s QR code filling `qr`, as one rectangle per run of dark modules in a
 * row, in layout coordinates. The quiet zone is the blank space the layout keeps around the box.
 */
export function qrRects(text: string, qr: Rect): Rect[] {
  const { data: rows } = encode(text, { ecc: "M", border: 0 });
  const moduleSize = qr.w / rows.length;
  const at = (value: number) => Number(value.toFixed(3));
  const rects: Rect[] = [];
  rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (!row[c]) {
        c += 1;
        continue;
      }
      const start = c;
      while (c < row.length && row[c]) {
        c += 1;
      }
      rects.push({
        x: at(qr.x + start * moduleSize),
        y: at(qr.y + r * moduleSize),
        w: at((c - start) * moduleSize),
        h: at(moduleSize),
      });
    }
  });
  return rects;
}

/**
 * PDF content-stream operators that paint `text` as a QR code filling `qr` on a page `pageHeight`
 * tall. One small stream with a single fill: drawn through pdf-lib's shape API, a QR per page made
 * 1,000-copy files several times slower and larger.
 */
export function qrOperators(text: string, qr: Rect, pageHeight: number) {
  const at = (value: number) => Number(value.toFixed(3));
  const runs = qrRects(text, qr).map(
    ({ x, y, w, h }) => `${x} ${at(pageHeight - y - h)} ${w} ${h} re`,
  );
  return `q 0 g\n${runs.join("\n")}\nf\nQ\n`;
}
