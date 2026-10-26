// Measures and breaks printed text with Figtree's advance widths, read from a table generated from
// the print font files (./figtree-metrics.generated.ts). Kerning and ligatures are off wherever the
// text is drawn, so a run's width is the sum of its characters' advances, here, in the preview and
// in the PDF alike.

import { FIGTREE_METRICS } from "#/lib/survey/figtree-metrics.generated";
import { parseBold } from "#/lib/survey/rich-text";

export type FontWeight = 400 | 600 | 700;

/** How a block of text is set: its size in points, its weight, and the weight of `**bold**` words. */
export type TextStyle = { size: number; weight: FontWeight; boldWeight: FontWeight };

/** Stretches of one weight on a line; `dx` is from the left of the box the text was broken in. */
export type PlacedLine = {
  runs: { text: string; weight: FontWeight; dx: number; width: number }[];
  width: number;
};

const ADVANCES = new Map(
  FIGTREE_METRICS.codePoints.map((codePoint, i) => [
    codePoint,
    {
      400: FIGTREE_METRICS.advances[400][i] ?? 0,
      600: FIGTREE_METRICS.advances[600][i] ?? 0,
      700: FIGTREE_METRICS.advances[700][i] ?? 0,
    },
  ]),
);

/** A capital letter's height as a share of the font size. */
export const CAP_HEIGHT = FIGTREE_METRICS.capHeight / FIGTREE_METRICS.unitsPerEm;

/** Rounds to 0.01 pt, so stored layouts read the same on every machine. */
export function roundPt(value: number) {
  return Math.round(value * 100) / 100;
}

/** The width of `text` in one weight at `size` points. A character the font lacks counts as 0. */
export function measure(text: string, weight: FontWeight, size: number) {
  let units = 0;
  for (const char of text) {
    units += ADVANCES.get(char.codePointAt(0) ?? 0)?.[weight] ?? 0;
  }
  return (units * size) / FIGTREE_METRICS.unitsPerEm;
}

/**
 * Text as the engine measures and prints it: accents composed into one character (macOS often
 * stores "é" as "e" plus a combining accent) and Windows line breaks as plain ones.
 */
export function normalizeText(text: string) {
  return text.normalize("NFC").replaceAll(/\r\n?/g, "\n");
}

/** The first character of the text the print font can't draw, if any. Line breaks and tabs are allowed. */
export function unprintableChar(text: string) {
  for (const char of normalizeText(text)) {
    if (char !== "\n" && char !== "\t" && !ADVANCES.has(char.codePointAt(0) ?? 0)) {
      return char;
    }
  }
}

type Piece = { char: string; weight: FontWeight; width: number };

/**
 * Breaks printed text (read with `parseBold`) into lines no wider than `maxWidth`, filling each
 * line with whole words. A line break in the text starts a new line; a word too wide for a line of
 * its own is split between characters. Spaces print only between words on a line. With `center`,
 * each line sits in the middle of the box.
 */
export function breakText(
  raw: string,
  style: TextStyle,
  maxWidth: number,
  align?: "center",
): PlacedLine[] {
  const lines: Piece[][] = [[]];
  // Running widths, each summed in the order its pieces were added, so no line is ever re-summed.
  let lineWidth = 0;
  let word: Piece[] = [];
  let wordWidth = 0;
  let spaces: Piece[] = [];
  let spacesWidth = 0;

  const current = () => lines.at(-1) ?? [];
  const startLine = (pieces: Piece[] = []) => {
    lines.push(pieces);
    lineWidth = pieces.reduce((sum, p) => sum + p.width, 0);
  };
  const placeWord = () => {
    if (word.length === 0) {
      return;
    }
    const line = current();
    if (line.length > 0 && lineWidth + spacesWidth + wordWidth > maxWidth) {
      startLine();
    } else if (line.length > 0) {
      for (const space of spaces) {
        line.push(space);
        lineWidth += space.width;
      }
    }
    for (const piece of word) {
      const target = current();
      if (target.length > 0 && lineWidth + piece.width > maxWidth) {
        startLine([piece]);
      } else {
        target.push(piece);
        lineWidth += piece.width;
      }
    }
    word = [];
    wordWidth = 0;
    spaces = [];
    spacesWidth = 0;
  };

  for (const run of parseBold(normalizeText(raw))) {
    const weight = run.bold ? style.boldWeight : style.weight;
    for (const char of run.text) {
      if (char === "\n") {
        placeWord();
        spaces = [];
        spacesWidth = 0;
        startLine();
      } else if (char === " " || char === "\t") {
        placeWord();
        const width = measure(" ", weight, style.size);
        spaces.push({ char: " ", weight, width });
        spacesWidth += width;
      } else {
        const width = measure(char, weight, style.size);
        word.push({ char, weight, width });
        wordWidth += width;
      }
    }
  }
  placeWord();

  if (lines.length === 1 && current().length === 0) {
    return [];
  }
  return lines.map((pieces) => placeLine(pieces, style.size, maxWidth, align));
}

/** Joins a line's characters into runs of one weight, each measured whole. */
function placeLine(pieces: Piece[], size: number, maxWidth: number, align?: "center") {
  const runs: { text: string; weight: FontWeight }[] = [];
  for (const { char, weight } of pieces) {
    const last = runs.at(-1);
    if (last?.weight === weight) {
      last.text += char;
    } else {
      runs.push({ text: char, weight });
    }
  }
  const measured = runs.map((run) => ({ ...run, width: measure(run.text, run.weight, size) }));
  const width = measured.reduce((sum, run) => sum + run.width, 0);
  let dx = align === "center" ? (maxWidth - width) / 2 : 0;
  return {
    width: roundPt(width),
    runs: measured.map((run) => {
      const placed = { ...run, dx: roundPt(dx), width: roundPt(run.width) };
      dx += run.width;
      return placed;
    }),
  };
}
