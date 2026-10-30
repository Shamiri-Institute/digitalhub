import { encode } from "uqr";

import type { Rect } from "#/lib/survey/layout";

/**
 * PDF content-stream operators that paint `text` as a QR code filling `qr` (layout coordinates,
 * measured down from the top of a page `pageHeight` tall). One rectangle per run of dark modules
 * and a single fill keep a page's QR to one small stream: drawn through pdf-lib's shape API, a
 * QR per page made 1,000-copy files several times slower and larger.
 */
export function qrOperators(text: string, qr: Rect, pageHeight: number) {
  // The quiet zone is the blank space the layout keeps around the QR box, so none is drawn here.
  const { data: rows } = encode(text, { ecc: "M", border: 0 });
  const moduleSize = qr.w / rows.length;
  const top = pageHeight - qr.y;
  const at = (value: number) => Number(value.toFixed(3));
  const runs: string[] = [];
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
      runs.push(
        `${at(qr.x + start * moduleSize)} ${at(top - (r + 1) * moduleSize)} ${at((c - start) * moduleSize)} ${at(moduleSize)} re`,
      );
    }
  });
  return `q 0 g\n${runs.join("\n")}\nf\nQ\n`;
}
