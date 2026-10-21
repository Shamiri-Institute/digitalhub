import { describe, expect, it } from "vitest";

import { parseBold, plainText, toggleBold } from "#/lib/survey/rich-text";

describe("parseBold", () => {
  it("splits text into bold and plain runs", () => {
    expect(parseBold("In the **last two weeks**, how often")).toEqual([
      { text: "In the ", bold: false },
      { text: "last two weeks", bold: true },
      { text: ", how often", bold: false },
    ]);
    expect(parseBold("**All** of it")).toEqual([
      { text: "All", bold: true },
      { text: " of it", bold: false },
    ]);
  });

  it("prints a marker without its pair as written", () => {
    expect(parseBold("2 ** 3")).toEqual([{ text: "2 ** 3", bold: false }]);
    expect(parseBold("**a** and **b")).toEqual([
      { text: "a", bold: true },
      { text: " and **b", bold: false },
    ]);
  });

  it("drops an empty pair", () => {
    expect(parseBold("a****b")).toEqual([
      { text: "a", bold: false },
      { text: "b", bold: false },
    ]);
  });
});

describe("plainText", () => {
  it("reads the text without markers", () => {
    expect(plainText("In the **last two weeks**")).toBe("In the last two weeks");
    expect(plainText("2 ** 3")).toBe("2 ** 3");
  });
});

describe("toggleBold", () => {
  it("wraps the selection and keeps it selected", () => {
    expect(toggleBold("How do you feel", 4, 6)).toEqual({
      value: "How **do** you feel",
      start: 6,
      end: 8,
    });
  });

  it("unwraps a selection that is already bold", () => {
    expect(toggleBold("How **do** you feel", 6, 8)).toEqual({
      value: "How do you feel",
      start: 4,
      end: 6,
    });
  });

  it("bolds all of a selection that crosses bold and plain words", () => {
    // "b** c" runs from inside the bold "ab" into the plain " cd".
    expect(toggleBold("x **ab** cd", 5, 10)).toEqual({ value: "x **ab c**d", start: 5, end: 8 });
  });

  it("unbolds a selection that takes in its markers", () => {
    expect(toggleBold("x **ab** cd", 2, 8)).toEqual({ value: "x ab cd", start: 2, end: 4 });
  });

  it("unbolds part of a bold run, leaving the rest bold", () => {
    expect(toggleBold("**abc**", 2, 3)).toEqual({ value: "a**bc**", start: 0, end: 1 });
  });

  it("inserts an empty pair at the caret", () => {
    expect(toggleBold("Hi ", 3, 3)).toEqual({ value: "Hi ****", start: 5, end: 5 });
  });
});
