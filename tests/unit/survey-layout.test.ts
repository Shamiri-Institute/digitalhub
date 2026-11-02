import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import type { SurveyForm, SurveyItem } from "#/lib/survey/form";
import {
  describeProblem,
  headerValueRun,
  LAYOUT_ENGINE_VERSION,
  layOutForm,
  type LayoutPage,
  type Prefill,
  type Rect,
  type ResponseField,
  sampleCopy,
} from "#/lib/survey/layout";
import { PRINT_FORM } from "./fixtures/survey-print-form";

const PREFILLS: Prefill[] = ["NONE", "SCHOOL", "STUDENT"];
/**
 * The fixture's layouts under every prefill, with sample and overlong header values fitted, hashed
 * for each engine version. Published versions store their layout with the engine version that made
 * it, so a change that moves anything on the page needs a new version: bump LAYOUT_ENGINE_VERSION
 * and add its hash. Never edit a recorded one.
 */
const LAYOUT_HASHES: Record<number, string> = {
  1: "6efbce7376bd2afbfad842b6e261100192a0bdd3388a8831c64fa0b6d3616ce3",
};
/** The content box: between the markers' outer edges, below the header, above the markers. */
const CONTENT = { left: 24, right: 571.28, top: 90, bottom: 796.89 };

function boxesOf(field: ResponseField): Rect[] {
  switch (field.kind) {
    case "choice":
      return field.marks.map((m) => m.box);
    case "digits":
      return field.cells;
    case "date":
      return [...field.day, ...field.month, ...field.year];
    case "text":
    case "signature":
      return [field.area];
  }
}

function overlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function textQuestion(i: number): SurveyItem {
  return {
    id: `t${i}`,
    kind: "text",
    key: `t${i}`,
    prompt: `Question ${i}`,
    required: false,
    lines: 2,
  };
}

describe("layOutForm", () => {
  const { layout } = layOutForm(PRINT_FORM, "NONE");

  it("needs a new engine version for any change to the layout", () => {
    const layouts = PREFILLS.map((prefill) => layOutForm(PRINT_FORM, prefill).layout);
    const longCopy = {
      serial: "WB27-000001-REPRINT-0002",
      school: "Long ".repeat(60),
      studentName: "Name ".repeat(60),
      studentId: "ID".repeat(40),
    };
    const headerValues = layouts.map((layout) =>
      layout.pages[0]?.header.map((slot) => [
        headerValueRun(slot, sampleCopy(layout)),
        headerValueRun(slot, longCopy),
      ]),
    );
    const hash = createHash("sha256")
      .update(JSON.stringify({ layouts, headerValues }))
      .digest("hex");
    expect(
      hash,
      `The layout changed. Bump LAYOUT_ENGINE_VERSION and record ${hash} as its hash.`,
    ).toBe(LAYOUT_HASHES[LAYOUT_ENGINE_VERSION]);
    expect(new Set(Object.values(LAYOUT_HASHES)).size).toBe(Object.keys(LAYOUT_HASHES).length);
  });

  it("numbers pages by their place in the form", () => {
    expect(layout.pages.map((p) => p.number)).toEqual([1, 2, 3]);
  });

  it("keeps every response box inside the content box", () => {
    for (const box of layout.pages.flatMap((p) => p.fields.flatMap(boxesOf))) {
      expect(box.x).toBeGreaterThanOrEqual(CONTENT.left);
      expect(box.x + box.w).toBeLessThanOrEqual(CONTENT.right);
      expect(box.y).toBeGreaterThanOrEqual(CONTENT.top);
      expect(box.y + box.h).toBeLessThanOrEqual(CONTENT.bottom);
    }
  });

  it("never overlaps two response boxes", () => {
    for (const page of layout.pages) {
      const boxes = page.fields.flatMap(boxesOf);
      boxes.forEach((a, i) => {
        for (const b of boxes.slice(i + 1)) expect(overlap(a, b)).toBe(false);
      });
    }
  });

  it("gives one field per question and one per grid row, on its page", () => {
    expect(layout.pages.map((p) => p.fields.map((f) => f.field))).toEqual([
      ["mood", "home", "sport"],
      ["phq.1", "phq.2", "phq.3", "phq.4", "phq.5", "age", "dob"],
      ["notes", "sign"],
    ]);
    const grid = layout.pages[1]?.fields[0];
    expect(grid?.kind === "choice" && grid.marks.map((m) => m.code)).toEqual(["0", "1", "2", "3"]);
  });

  it("prints the same page whatever the prefill, apart from the header", () => {
    for (const prefill of PREFILLS) {
      const other = layOutForm(PRINT_FORM, prefill);
      expect(other.problems).toEqual([]);
      const withoutHeader = (page: LayoutPage) => ({ ...page, header: [] });
      expect(other.layout.pages.map(withoutHeader)).toEqual(layout.pages.map(withoutHeader));
    }
  });

  it("prints exactly the prefilled fields in the header of every page", () => {
    const slots = (prefill: Prefill) =>
      layOutForm(PRINT_FORM, prefill).layout.pages.map((p) => p.header.map((s) => s.slot));
    expect(slots("NONE")).toEqual([["serial"], ["serial"], ["serial"]]);
    expect(slots("SCHOOL")).toEqual(Array(3).fill(["serial", "school"]));
    expect(slots("STUDENT")).toEqual(Array(3).fill(["serial", "studentName", "studentId"]));
  });

  it("prints a rating scale as a row of square boxes", () => {
    const mood = layout.pages[0]?.fields[0];
    expect(mood?.kind).toBe("choice");
    if (mood?.kind !== "choice") return;
    expect(mood.mark).toBe("square");
    expect(new Set(mood.marks.map((m) => m.box.y)).size).toBe(1);
    expect(mood.marks.map((m) => m.box.w)).toEqual([14, 14, 14, 14, 14]);
  });

  it("centres a centred heading on the page", () => {
    const heading = layout.pages[0]?.content.filter((d) => d.kind === "text" && d.run.size === 15);
    const runs = heading?.flatMap((d) => (d.kind === "text" ? [d.run] : [])) ?? [];
    const left = Math.min(...runs.map((r) => r.x));
    const right = Math.max(...runs.map((r) => r.x + r.width));
    expect((left + right) / 2).toBeCloseTo((CONTENT.left + CONTENT.right) / 2, 1);
  });

  it("sets **bold** words in bold", () => {
    const runs = layout.pages.flatMap((p) =>
      p.content.flatMap((d) => (d.kind === "text" ? [d.run] : [])),
    );
    const weightOf = (text: string) => runs.find((r) => r.text === text)?.weight;
    // A heading is bold throughout, so its bold words don't stand apart.
    expect(weightOf("Student wellbeing survey")).toBe(700);
    expect(weightOf("every")).toBe(700);
    expect(weightOf("last two weeks")).toBe(700);
    expect(weightOf("Please answer ")).toBe(400);
  });

  it("names the page and every item that runs past the bottom", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        { items: [textQuestion(0)] },
        { items: Array.from({ length: 12 }, (_, i) => textQuestion(i + 1)) },
      ],
    };
    const result = layOutForm(form, "NONE");
    expect(result.problems).toEqual([
      { kind: "overflow", page: 2, itemIds: ["t8", "t9", "t10", "t11", "t12"], overBy: 379.11 },
    ]);
    const [problem] = result.problems;
    expect(problem && describeProblem(problem, form)).toBe(
      "Page 2 doesn't fit on A4: it runs 134 mm past the bottom. Move item 8 (“Question 8”) and 4 more items to another page.",
    );
    // The items that don't fit still have places, below the paper's content box.
    expect(result.layout.pages[1]?.items.at(-1)?.box.y).toBeGreaterThan(CONTENT.bottom);
  });

  it("refuses characters the print font lacks", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [{ items: [{ id: "e", kind: "heading", text: "Feeling 😀 today" }] }],
    };
    const { problems: found } = layOutForm(form, "NONE");
    expect(found).toEqual([{ kind: "unprintable", page: 1, itemId: "e", char: "😀" }]);
  });

  it("lays out a cleared digits or lines field as one, so later items keep their places", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        {
          items: [
            {
              id: "n",
              kind: "number",
              key: "n",
              prompt: "Age",
              required: false,
              digits: Number.NaN,
            },
            {
              id: "t",
              kind: "text",
              key: "t",
              prompt: "Notes",
              required: false,
              lines: Number.NaN,
            },
            { id: "h", kind: "heading", text: "After" },
          ],
        },
      ],
    };
    const { layout, problems: found } = layOutForm(form, "NONE");
    expect(found).toEqual([]);
    const [digits, notes] = layout.pages[0]?.fields ?? [];
    expect(digits?.kind === "digits" && digits.cells).toHaveLength(1);
    expect(notes?.kind === "text" && notes.lines).toBe(1);
    expect(JSON.stringify(layout)).not.toContain("null");
  });

  it("prints a page title's tabs and line breaks as single spaces", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        { title: "About\tyou\r\nand  home", items: [{ id: "h", kind: "heading", text: "Hi" }] },
      ],
    };
    const title = layOutForm(form, "NONE").layout.pages[0]?.content[1];
    expect(title?.kind === "text" && title.run.text).toBe("About you and home");
  });

  it("prints accents typed as a letter and a combining mark, and Windows line breaks", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [{ items: [{ id: "p", kind: "paragraph", text: "Caf\u0065\u0301\r\nSoma" }] }],
    };
    const { layout, problems: found } = layOutForm(form, "NONE");
    expect(found).toEqual([]);
    const texts = layout.pages[0]?.content.flatMap((d) => (d.kind === "text" ? [d.run.text] : []));
    expect(texts?.slice(-2)).toEqual(["Caf\u00e9", "Soma"]);
  });

  it("names a character it can't print by its code point when it can't be seen", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [{ items: [{ id: "h", kind: "heading", text: "Kind\u200bly" }] }],
    };
    const [problem] = layOutForm(form, "NONE").problems;
    expect(problem && describeProblem(problem, form)).toBe(
      "Page 1: item 1 (“Kind\u200bly”) uses “\u200b” (U+200B), which the print font can't print. Remove it.",
    );
  });

  it("keeps a line for blank text, with a stand-in the builder shows", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        {
          items: [
            { id: "h", kind: "heading", text: "****" },
            { id: "q", kind: "date", key: "q", prompt: " ", required: false },
            { id: "p", kind: "paragraph", text: "Written" },
          ],
        },
      ],
    };
    const [heading, question, paragraph] = layOutForm(form, "NONE").layout.pages[0]?.items ?? [];
    expect(heading?.standIn?.text).toBe("Heading");
    expect(heading?.box.h).toBe(19);
    expect(question?.standIn?.text).toBe("Question");
    expect(paragraph?.standIn).toBeUndefined();
    expect(layOutForm(PRINT_FORM, "NONE").layout.pages.flatMap((p) => p.items)).not.toContainEqual(
      expect.objectContaining({ standIn: expect.anything() }),
    );
  });

  it("centres a centred heading's stand-in, and gives text of only line breaks one", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        {
          items: [
            { id: "c", kind: "heading", text: "", align: "center" },
            { id: "n", kind: "paragraph", text: "\n\n\n" },
          ],
        },
      ],
    };
    const [centred, breaks] = layOutForm(form, "NONE").layout.pages[0]?.items ?? [];
    const standIn = centred?.standIn ?? { x: 0, width: 0 };
    expect(standIn.x + standIn.width / 2).toBeCloseTo((24 + 571.28) / 2, 1);
    expect(breaks?.standIn?.text).toBe("Paragraph");
    expect(breaks?.box.h).toBe(15);
  });

  it("prints a page title's unusual spaces as plain ones instead of refusing them", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        {
          title: "\uFEFFAbout\u2003you\u2009today",
          items: [{ id: "h", kind: "heading", text: "Hi" }],
        },
      ],
    };
    const { layout, problems: found } = layOutForm(form, "NONE");
    expect(found).toEqual([]);
    const title = layout.pages[0]?.content[1];
    expect(title?.kind === "text" && title.run.text).toBe("About you today");
  });

  it("tells apart two items that read the same by their position", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        {
          items: [
            { id: "a", kind: "heading", text: "Mood 😀" },
            { id: "b", kind: "heading", text: "Mood 😀" },
          ],
        },
      ],
    };
    const messages = layOutForm(form, "NONE").problems.map((p) => describeProblem(p, form));
    expect(messages).toEqual([
      "Page 1: item 1 (“Mood 😀”) uses “😀”, which the print font can't print. Remove it.",
      "Page 1: item 2 (“Mood 😀”) uses “😀”, which the print font can't print. Remove it.",
    ]);
  });

  it("shortens a long item name in a problem without splitting an emoji", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [{ items: [{ id: "h", kind: "heading", text: `${"a".repeat(28)}😀😀 and Ω` }] }],
    };
    const [problem] = layOutForm(form, "NONE").problems;
    expect(problem && describeProblem(problem, form)).toBe(
      `Page 1: item 1 (“${"a".repeat(28)}😀…”) uses “😀”, which the print font can't print. Remove it.`,
    );
  });

  it("refuses characters the print font lacks in a page title", () => {
    const form: SurveyForm = {
      format: 1,
      pages: [{ title: "Hello 😀", items: [{ id: "h", kind: "heading", text: "Hi" }] }],
    };
    const { problems: found } = layOutForm(form, "NONE");
    expect(found).toEqual([{ kind: "unprintable_title", page: 1, char: "😀" }]);
    const [problem] = found;
    expect(problem && describeProblem(problem, form)).toBe(
      "Page 1's title uses “😀”, which the print font can't print. Remove it.",
    );
  });

  it("refuses a grid whose options leave no room for its rows", () => {
    const options = Array.from({ length: 17 }, (_, i) => ({
      code: `c${i}`,
      label: `Option number ${i}`,
    }));
    const form: SurveyForm = {
      format: 1,
      pages: [
        {
          items: [
            {
              id: "g",
              kind: "grid",
              key: "g",
              prompt: "Wide",
              required: false,
              options,
              rows: [{ key: "1", label: "Row" }],
            },
          ],
        },
      ],
    };
    expect(layOutForm(form, "NONE").problems).toEqual([{ kind: "too_wide", page: 1, itemId: "g" }]);
  });
});

describe("rating scales", () => {
  // The mark a single choice question with these option labels prints.
  const markFor = (labels: string[]) => {
    const form: SurveyForm = {
      format: 1,
      pages: [
        {
          title: "Rating",
          items: [
            {
              id: "s",
              kind: "single_choice",
              key: "s",
              prompt: "Pick one",
              required: false,
              options: labels.map((label, i) => ({ code: `${i}`, label })),
            },
          ],
        },
      ],
    };
    const field = layOutForm(form, "NONE").layout.pages[0]?.fields[0];
    return field?.kind === "choice" ? field.mark : undefined;
  };

  it("prints short numbers as square boxes and anything else as circles", () => {
    expect(markFor(["1", "2", "3", "4", "5"])).toBe("square");
    expect(markFor(["-2", "-1", "0", "**1**", " 2 "])).toBe("square");
    expect(markFor(["Yes", "No"])).toBe("circle");
    expect(markFor(["1"])).toBe("circle");
    expect(markFor(Array.from({ length: 12 }, (_, i) => `${i}`))).toBe("circle");
    expect(markFor(["1", "100"])).toBe("circle");
  });
});

describe("response ink", () => {
  it("prints a mark on every choice, a box on every cell and signature, and lines to write on", () => {
    const { layout } = layOutForm(PRINT_FORM, "NONE");
    for (const page of layout.pages) {
      const circles = page.content.filter((d) => d.kind === "circle");
      const rects = page.content.flatMap((d) => (d.kind === "rect" ? [d.rect] : []));
      for (const field of page.fields) {
        if (field.kind === "choice" && field.mark === "circle") {
          for (const { box } of field.marks) {
            expect(circles).toContainEqual({
              kind: "circle",
              cx: box.x + box.w / 2,
              cy: box.y + box.h / 2,
              r: box.w / 2,
              stroke: 1,
            });
          }
        } else if (field.kind !== "text") {
          for (const box of boxesOf(field)) expect(rects).toContainEqual(box);
        }
      }
    }
    const writingLines = layout.pages[2]?.content.filter((d) => d.kind === "line" && d.dotted);
    expect(writingLines).toHaveLength(3);
  });
});

describe("headerValueRun", () => {
  it("shrinks and then shortens a value until it fits its slot", () => {
    const { layout } = layOutForm(PRINT_FORM, "SCHOOL");
    const school = layout.pages[0]?.header[1];
    if (!school) throw new Error("no school slot");
    const short = headerValueRun(school, { serial: "S", school: "Moi Girls" });
    expect(short).toMatchObject({ text: "Moi Girls", size: 9 });
    const long = headerValueRun(school, { serial: "S", school: "Long ".repeat(60) });
    expect(long.size).toBe(6);
    expect(long.text.endsWith("…")).toBe(true);
    expect(long.width).toBeLessThanOrEqual(school.value.maxWidth);
  });

  it("leaves out characters the font lacks, so the value prints as wide as measured", () => {
    const { layout } = layOutForm(PRINT_FORM, "SCHOOL");
    const school = layout.pages[0]?.header[1];
    if (!school) throw new Error("no school slot");
    const run = headerValueRun(school, { serial: "S", school: "Moi\u200b Girls 😀" });
    expect(run).toMatchObject({ text: "Moi Girls", size: 9 });
  });
});
