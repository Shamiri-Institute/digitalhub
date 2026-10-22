import { describe, expect, it } from "vitest";

import { isBlank, parseBold, plainText } from "#/lib/survey/rich-text";

describe("parseBold", () => {
  it("splits text into bold and plain runs, with where each starts", () => {
    expect(parseBold("In the **last two weeks**, how often")).toEqual([
      { text: "In the ", bold: false, start: 0 },
      { text: "last two weeks", bold: true, start: 9 },
      { text: ", how often", bold: false, start: 25 },
    ]);
  });

  it("prints a marker without its pair as written", () => {
    expect(parseBold("2 ** 3")).toEqual([{ text: "2 ** 3", bold: false, start: 0 }]);
    expect(parseBold("**a** and **b")).toEqual([
      { text: "a", bold: true, start: 2 },
      { text: " and **b", bold: false, start: 5 },
    ]);
  });

  it("reads \\* as an asterisk and \\\\ as a backslash", () => {
    expect(plainText("5 \\*\\* 2 is **25**")).toBe("5 ** 2 is 25");
    expect(plainText("C:\\\\files and a \\ alone")).toBe("C:\\files and a \\ alone");
  });

  it("drops an empty pair", () => {
    expect(parseBold("a****b")).toEqual([{ text: "ab", bold: false, start: 0 }]);
  });
});

describe("isBlank", () => {
  it("counts spaces and markers alone as blank", () => {
    for (const text of ["", "   ", "****", "** **"]) expect(isBlank(text)).toBe(true);
    expect(isBlank("\\*")).toBe(false);
  });
});
