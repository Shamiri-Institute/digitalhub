// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";

import { layOutForm, sampleCopy, type TextRun } from "#/lib/survey/layout";
import { PRINT_FONT_FILES, type PrintFonts } from "#/lib/survey/print-fonts";
import { renderCopiesPdf } from "#/lib/survey/print-pdf";
import { PRINT_FORM } from "./fixtures/survey-print-form";

function readFont(file: string) {
  return new Uint8Array(fs.readFileSync(path.join(process.cwd(), "public/fonts/figtree", file)));
}

const fonts: PrintFonts = {
  400: readFont(PRINT_FONT_FILES[400]),
  600: readFont(PRINT_FONT_FILES[600]),
  700: readFont(PRINT_FONT_FILES[700]),
};

describe("renderCopiesPdf", () => {
  it("prints every page of the layout for each copy, with the print fonts embedded", async () => {
    const { layout } = layOutForm(PRINT_FORM, "STUDENT");
    const copies = [
      { serial: "WB27-000001", studentName: "Achieng Otieno", studentId: "STU-1" },
      { serial: "WB27-000002", studentName: "Baraka Mwangi", studentId: "STU-2" },
    ];
    const bytes = await renderCopiesPdf(layout, copies, fonts);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(6);
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 });
    const baseFonts = doc.context
      .enumerateIndirectObjects()
      .flatMap(([, object]) =>
        object instanceof PDFDict ? [object.get(PDFName.of("BaseFont"))?.toString()] : [],
      )
      .filter((name) => name !== undefined)
      // pdf-lib tags each embedded font's name with a random number.
      .map((name) => name.replace(/-\d+$/, ""));
    expect(new Set(baseFonts)).toEqual(
      new Set(["/Figtree-Regular", "/Figtree-SemiBold", "/Figtree-Bold"]),
    );
  });

  it("prints a sample copy of any prefill", async () => {
    for (const prefill of ["NONE", "SCHOOL", "STUDENT"] as const) {
      const { layout } = layOutForm(PRINT_FORM, prefill);
      const doc = await PDFDocument.load(
        await renderCopiesPdf(layout, [sampleCopy(layout)], fonts),
      );
      expect(doc.getPageCount()).toBe(3);
    }
  });

  it("prints the watermark across every page only when asked", async () => {
    const { layout } = layOutForm(PRINT_FORM, "NONE");
    const pageTexts = async (bytes: Uint8Array) => {
      const pdf = await getDocument({ data: bytes }).promise;
      const texts: string[] = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const content = await (await pdf.getPage(number)).getTextContent();
        texts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
      }
      return texts;
    };
    const watermarked = await pageTexts(
      await renderCopiesPdf(layout, [sampleCopy(layout)], fonts, { watermark: "PREVIEW" }),
    );
    expect(watermarked).toHaveLength(3);
    for (const text of watermarked) {
      expect(text).toContain("PREVIEW");
    }
    const plain = await pageTexts(await renderCopiesPdf(layout, [sampleCopy(layout)], fonts));
    for (const text of plain) {
      expect(text).not.toContain("PREVIEW");
    }
  });

  it("sets every run as wide as the layout measured it", async () => {
    const { layout } = layOutForm(PRINT_FORM, "SCHOOL");
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    const features = { kern: false, liga: false, clig: false, calt: false };
    const embedded = {
      400: await doc.embedFont(fonts[400], { subset: false, features }),
      600: await doc.embedFont(fonts[600], { subset: false, features }),
      700: await doc.embedFont(fonts[700], { subset: false, features }),
    };
    const runs: TextRun[] = layout.pages.flatMap((page) => [
      ...page.header.map((slot) => slot.label),
      ...page.content.flatMap((d) => (d.kind === "text" ? [d.run] : [])),
    ]);
    expect(runs.length).toBeGreaterThan(50);
    for (const run of runs) {
      const width = embedded[run.weight].widthOfTextAtSize(run.text, run.size);
      expect(Math.abs(width - run.width), run.text).toBeLessThanOrEqual(0.006);
    }
  });
});
