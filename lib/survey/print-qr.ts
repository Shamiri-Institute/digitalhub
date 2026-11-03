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

/**
 * The page id a scanned QR code names, or undefined for one that isn't a page's, such as a sample's.
 * A typeid suffix is 26 Crockford base32 characters, the first 0 to 7.
 */
export function pageIdFromQrText(text: string) {
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/.test(text)
    ? `${PAGE_ID_PREFIX}${text.toLowerCase()}`
    : undefined;
}

/**
 * The dark modules of `text`'s QR code filling `qr`, as one rectangle per run of dark modules in a
 * row, in layout coordinates. The quiet zone is the blank space the layout keeps around the box.
 */
export function qrRects(text: string, qr: Rect): Rect[] {
  const { data: moduleRows } = encode(text, { ecc: "M", border: 0 });
  const moduleSize = qr.w / moduleRows.length;
  const at = (value: number) => Number(value.toFixed(3));
  const darkRuns: Rect[] = [];
  moduleRows.forEach((darkModules, rowIndex) => {
    let column = 0;
    while (column < darkModules.length) {
      if (!darkModules[column]) {
        column += 1;
        continue;
      }
      const runStart = column;
      while (column < darkModules.length && darkModules[column]) {
        column += 1;
      }
      darkRuns.push({
        x: at(qr.x + runStart * moduleSize),
        y: at(qr.y + rowIndex * moduleSize),
        w: at((column - runStart) * moduleSize),
        h: at(moduleSize),
      });
    }
  });
  return darkRuns;
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
