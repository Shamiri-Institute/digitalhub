// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { PDFDict, PDFDocument, PDFName } from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";

import { headerValueRun, layOutForm, sampleCopy } from "#/lib/survey/layout";
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

async function pageTexts(bytes: Uint8Array) {
  const pdf = await getDocument({ data: bytes }).promise;
  const texts: string[] = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    const content = await (await pdf.getPage(number)).getTextContent();
    texts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return texts;
}

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
    const texts = await pageTexts(bytes);
    for (const [index, text] of texts.entries()) {
      const copy = index < 3 ? copies[0] : copies[1];
      const other = index < 3 ? copies[1] : copies[0];
      expect(text).toContain(copy?.serial);
      expect(text).toContain(copy?.studentName);
      expect(text).not.toContain(other?.serial);
    }
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

  it("draws every run as wide as the layout measured it", async () => {
    const { layout } = layOutForm(PRINT_FORM, "SCHOOL");
    const copy = sampleCopy(layout);
    const pdf = await getDocument({ data: await renderCopiesPdf(layout, [copy], fonts) }).promise;
    let checked = 0;
    for (const [index, laid] of layout.pages.entries()) {
      const items = (await (await pdf.getPage(index + 1)).getTextContent()).items.flatMap((item) =>
        "str" in item && item.str !== ""
          ? [{ x: item.transform[4] as number, y: item.transform[5] as number, width: item.width }]
          : [],
      );
      const runs = [
        ...laid.header.flatMap((slot) => [slot.label, headerValueRun(slot, copy)]),
        ...laid.content.flatMap((drawable) => (drawable.kind === "text" ? [drawable.run] : [])),
      ].filter((run) => run.text.trim() !== "");
      for (const run of runs) {
        const baseline = layout.paper.height - run.baseline;
        // pdf.js splits a run at its spaces and fills the gaps between runs, so take where the
        // last piece starting inside the run ends.
        const end = Math.max(
          ...items
            .filter(
              (item) =>
                Math.abs(item.y - baseline) < 0.01 &&
                item.x >= run.x - 0.01 &&
                item.x < run.x + run.width - 0.01,
            )
            .map((item) => item.x + item.width),
        );
        expect(Math.abs(end - (run.x + run.width)), run.text).toBeLessThanOrEqual(0.01);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });
});
