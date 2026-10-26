// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { FIGTREE_METRICS } from "#/lib/survey/figtree-metrics.generated";
import { PRINT_FONT_FILES } from "#/lib/survey/print-fonts";
import { breakText, type FontWeight, measure, unprintableChar } from "#/lib/survey/text-metrics";

const WEIGHTS = [400, 600, 700] as const satisfies FontWeight[];

function fontBytes(weight: FontWeight) {
  return fs.readFileSync(
    path.join(process.cwd(), "public/fonts/figtree", PRINT_FONT_FILES[weight]),
  );
}

const style = { size: 10, weight: 400, boldWeight: 700 } as const;

describe("the Figtree metrics table", () => {
  it("holds the advance of every character as the print font files have it", () => {
    for (const weight of WEIGHTS) {
      const font = fontkit.create(fontBytes(weight));
      expect(font.unitsPerEm).toBe(FIGTREE_METRICS.unitsPerEm);
      expect(font.capHeight).toBe(FIGTREE_METRICS.capHeight);
      const fromFont = FIGTREE_METRICS.codePoints.map(
        (codePoint) => font.glyphForCodePoint(codePoint).advanceWidth,
      );
      expect(fromFont).toEqual(FIGTREE_METRICS.advances[weight]);
    }
  });

  it("measures text as wide as pdf-lib draws it with the embedded font", async () => {
    const corpus = [
      "Over the last two weeks, how often have you been bothered by",
      "Little interest or pleasure in doing things",
      "Ndiyo / Hapana — “quoted” ‘text’ … • 0123456789",
      "Wâ ñ ö ß ŵ Ł ę ž AVATAR fi fl ffi office Ťý",
    ];
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    for (const weight of WEIGHTS) {
      const font = await doc.embedFont(fontBytes(weight), {
        subset: false,
        features: { kern: false, liga: false, clig: false, calt: false },
      });
      for (const text of corpus) {
        for (const size of [8, 10.5, 15]) {
          expect(measure(text, weight, size)).toBeCloseTo(font.widthOfTextAtSize(text, size), 6);
        }
      }
    }
  });
});

describe("unprintableChar", () => {
  it("finds the first character the print font lacks", () => {
    expect(unprintableChar("Habari yako?\nNzuri sana\tasante")).toBeUndefined();
    expect(unprintableChar("Feeling 😀 or 😢")).toBe("😀");
    expect(unprintableChar("Ω")).toBe("Ω");
  });
});

describe("breakText", () => {
  it("sets a bold part of a word in bold, on the same line", () => {
    expect(breakText("un**likely** to happen", style, 1000)).toEqual([
      {
        width: 83.44,
        runs: [
          { text: "un", weight: 400, dx: 0, width: 11.16 },
          { text: "likely", weight: 700, dx: 11.16, width: 24.22 },
          { text: " to happen", weight: 400, dx: 35.38, width: 48.06 },
        ],
      },
    ]);
  });

  it("fills lines with whole words and drops the spaces at a break", () => {
    expect(breakText("one two three four", style, 50).map(texts)).toEqual([
      ["one two"],
      ["three four"],
    ]);
  });

  it("splits a word too wide for any line between characters", () => {
    expect(breakText("Supercalifragilistic", style, 40).map(texts)).toEqual([
      ["Supercal"],
      ["ifragilisti"],
      ["c"],
    ]);
  });

  it("starts a new line at each line break, keeping empty lines", () => {
    expect(breakText("a\n\nb", style, 100).map(texts)).toEqual([["a"], [], ["b"]]);
  });

  it("centres each line in the box", () => {
    expect(breakText("Hi", style, 100, "center")).toEqual([
      { width: 9.83, runs: [{ text: "Hi", weight: 400, dx: 45.09, width: 9.83 }] },
    ]);
  });

  it("reads escapes and markers through parseBold", () => {
    expect(breakText("5 \\*\\* 2 is **25**", style, 1000).map(texts)).toEqual([
      ["5 ** 2 is ", "25"],
    ]);
  });

  it("prints a fraction slash as a slash, as wide as pdf-lib draws it", async () => {
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes(400), {
      subset: false,
      features: { kern: false, liga: false, clig: false, calt: false },
    });
    const [line] = breakText("1\u20442 cup", style, 1000);
    expect(line?.runs.map((run) => run.text)).toEqual(["1/2 cup"]);
    expect(line?.width).toBeCloseTo(font.widthOfTextAtSize("1/2 cup", style.size), 2);
  });

  it("gives no lines for empty text", () => {
    expect(breakText("", style, 100)).toEqual([]);
  });
});

function texts(line: { runs: { text: string }[] }) {
  return line.runs.map((run) => run.text);
}
