import { describe, expect, it } from "vitest";

import { checkPublishable } from "#/lib/survey/check-form";
import type { SurveyForm, SurveyItem } from "#/lib/survey/form";
import { describeProblem } from "#/lib/survey/layout";
import { checkPublish } from "#/lib/survey/publish";
import { PRINT_FORM } from "./fixtures/survey-print-form";

const age: SurveyItem = {
  id: "age",
  kind: "number",
  key: "age",
  prompt: "Age",
  required: true,
  digits: 2,
};

function form(...pages: SurveyItem[][]): SurveyForm {
  return { format: 1, pages: pages.map((items) => ({ items })) };
}

describe("checkPublishable", () => {
  it("accepts a finished form", () => {
    expect(checkPublishable(PRINT_FORM)).toEqual([]);
  });

  it("asks for a page", () => {
    expect(checkPublishable(form())).toEqual([
      { field: "form", message: "Add a page before publishing" },
    ]);
  });

  it("names each empty page", () => {
    expect(checkPublishable(form([age], [], []))).toEqual([
      { field: "pages.1", message: "Page 2 is empty. Add items to it or remove it." },
      { field: "pages.2", message: "Page 3 is empty. Add items to it or remove it." },
    ]);
  });

  it("asks for a question", () => {
    expect(checkPublishable(form([{ id: "h", kind: "heading", text: "Hello" }]))).toEqual([
      { field: "form", message: "Add a question before publishing" },
    ]);
  });

  it("asks for two options on choice questions and grids, and a row on grids", () => {
    const one = [{ code: "1", label: "Yes" }];
    expect(
      checkPublishable(
        form([
          { id: "s", kind: "single_choice", key: "s", prompt: "S", required: false, options: one },
          { id: "m", kind: "multiple_choice", key: "m", prompt: "M", required: false, options: [] },
          { id: "g", kind: "grid", key: "g", prompt: "G", required: false, options: one, rows: [] },
        ]),
      ),
    ).toEqual([
      { itemId: "s", field: "options", message: "Page 1, item 1: add at least two options" },
      { itemId: "m", field: "options", message: "Page 1, item 2: add at least two options" },
      { itemId: "g", field: "options", message: "Page 1, item 3: add at least two options" },
      { itemId: "g", field: "rows", message: "Page 1, item 3: add at least one row" },
    ]);
  });

  it("names every blank heading, paragraph, prompt and label, bold markers or not", () => {
    const options = [
      { code: "1", label: "Yes" },
      { code: "2", label: " **  ** " },
    ];
    expect(
      checkPublishable(
        form(
          [age, { id: "h", kind: "heading", text: "  " }],
          [
            { id: "p", kind: "paragraph", text: "****" },
            { id: "s", kind: "single_choice", key: "s", prompt: "", required: false, options },
            {
              id: "g",
              kind: "grid",
              key: "g",
              prompt: "How often?",
              required: false,
              options: [
                { code: "1", label: "Never" },
                { code: "2", label: "Often" },
              ],
              rows: [
                { key: "a", label: "Sleep" },
                { key: "b", label: "" },
              ],
            },
          ],
        ),
      ),
    ).toEqual([
      {
        itemId: "h",
        field: "text",
        message: "Page 1, item 2: write the heading's text, or remove it",
      },
      {
        itemId: "p",
        field: "text",
        message: "Page 2, item 1: write the paragraph's text, or remove it",
      },
      { itemId: "s", field: "prompt", message: "Page 2, item 2: write the question" },
      { itemId: "s", field: "options.1.label", message: "Page 2, item 2: give option 2 a label" },
      { itemId: "g", field: "rows.1.label", message: "Page 2, item 3: give row 2 a label" },
    ]);
  });
});

describe("checkPublish", () => {
  it("lays out a finished form with the chosen prefill", () => {
    const result = checkPublish(PRINT_FORM, [], "STUDENT");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.layout.prefill).toBe("STUDENT");
    expect(result.layout.pages).toHaveLength(3);
  });

  it("stops at the saving rules for a form that doesn't parse", () => {
    expect(checkPublish({ format: 1, pages: [{ items: [{ kind: "nope" }] }] }, [], "NONE")).toEqual(
      {
        ok: false,
        issues: [expect.objectContaining({ field: "form" })],
        problems: [],
      },
    );
  });

  it("refuses a page that runs past the bottom and names it", () => {
    const text = (i: number): SurveyItem => ({
      id: `t${i}`,
      kind: "text",
      key: `t${i}`,
      prompt: `Question ${i}`,
      required: false,
      lines: 30,
    });
    const tooLong = form([age], [text(1), text(2)]);
    const result = checkPublish(tooLong, [], "SCHOOL");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual([]);
    expect(result.problems.map((p) => describeProblem(p, tooLong))).toEqual([
      "Page 2 doesn't fit on A4: it runs 343 mm past the bottom. Move “Question 1” and 1 more item to another page.",
    ]);
  });
});
