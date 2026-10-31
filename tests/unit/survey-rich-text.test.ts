import { describe, expect, it } from "vitest";

import { isBlank, parseBold, plainText } from "#/lib/survey/rich-text";

describe("parseBold", () => {
  it("splits text into bold and plain runs", () => {
    expect(parseBold("In the **last two weeks**, how often")).toEqual([
      { text: "In the ", bold: false },
      { text: "last two weeks", bold: true },
      { text: ", how often", bold: false },
    ]);
  });

  it("prints a marker without its pair as written", () => {
    expect(parseBold("2 ** 3")).toEqual([{ text: "2 ** 3", bold: false }]);
    expect(parseBold("**a** and **b")).toEqual([
      { text: "a", bold: true },
      { text: " and **b", bold: false },
    ]);
  });

  it("reads \\* as an asterisk and \\\\ as a backslash", () => {
    expect(plainText("5 \\*\\* 2 is **25**")).toBe("5 ** 2 is 25");
    expect(plainText("C:\\\\files and a \\ alone")).toBe("C:\\files and a \\ alone");
  });

  it("drops an empty pair", () => {
    expect(parseBold("a****b")).toEqual([{ text: "ab", bold: false }]);
  });
});

describe("isBlank", () => {
  it("counts spaces and markers alone as blank", () => {
    for (const text of ["", "   ", "****", "** **"]) expect(isBlank(text)).toBe(true);
    expect(isBlank("\\*")).toBe(false);
  });
});
