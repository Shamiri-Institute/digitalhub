import { describe, expect, it } from "vitest";

import { applyEdit, isBlank, parseBold, plainText, toggleBold } from "#/lib/survey/rich-text";

/** The text and selection after toggling bold on `value` from `start` to `end`. */
function bolded(value: string, start: number, end: number) {
  const edit = toggleBold(value, start, end);
  if (!edit) return null;
  return { value: applyEdit(value, edit), start: edit.start, end: edit.end };
}

/** Selects `words` in `value` and toggles bold. */
function boldWords(value: string, words: string) {
  const start = value.indexOf(words);
  return bolded(value, start, start + words.length);
}

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

describe("toggleBold", () => {
  it("wraps the selection and keeps it selected", () => {
    expect(bolded("How do you feel", 4, 6)).toEqual({
      value: "How **do** you feel",
      start: 6,
      end: 8,
    });
  });

  it("unwraps a selection that is already bold", () => {
    expect(bolded("How **do** you feel", 6, 8)).toEqual({
      value: "How do you feel",
      start: 4,
      end: 6,
    });
  });

  it("bolds all of a selection that crosses bold and plain words", () => {
    // "b** c" runs from inside the bold "ab" into the plain " cd".
    expect(bolded("x **ab** cd", 5, 10)).toEqual({ value: "x **ab c**d", start: 5, end: 8 });
  });

  it("unbolds a selection that takes in its markers", () => {
    expect(bolded("x **ab** cd", 2, 8)).toEqual({ value: "x ab cd", start: 2, end: 4 });
  });

  it("unbolds part of a bold run, leaving the rest bold", () => {
    expect(bolded("**abc**", 2, 3)).toEqual({ value: "a**bc**", start: 0, end: 1 });
  });

  it("changes nothing outside the selection", () => {
    // The empty pair after "a" is not the selection's business.
    expect(bolded("a**** b c", 8, 9)).toEqual({ value: "a**** b **c**", start: 10, end: 11 });
  });

  it("keeps a literal ** from pairing with the new marker", () => {
    const result = boldWords("5 ** 2 is 25", "25");
    expect(result?.value).toBe("5 \\*\\* 2 is **25**");
    expect(parseBold(result?.value ?? "")).toEqual([
      { text: "5 ** 2 is ", bold: false, start: 0 },
      { text: "25", bold: true, start: 14 },
    ]);
  });

  it("escapes a literal asterisk beside a new marker, and undoes itself", () => {
    const once = boldWords("a *b c", "b");
    expect(once?.value).toBe("a \\***b** c");
    expect(plainText(once?.value ?? "")).toBe("a *b c");
    const twice = once && bolded(once.value, once.start, once.end);
    expect(twice?.value).toBe("a \\*b c");
    expect(plainText(twice?.value ?? "")).toBe("a *b c");
  });

  it("bolds a run of asterisks as text, not as markers", () => {
    const result = bolded("x \\*\\*\\* y", 2, 8);
    expect(parseBold(result?.value ?? "")).toEqual([
      { text: "x ", bold: false, start: 0 },
      { text: "***", bold: true, start: 4 },
      { text: " y", bold: false, start: 12 },
    ]);
  });

  it("does nothing to a selection of markers alone", () => {
    expect(toggleBold("a****b", 1, 5)).toBeNull();
  });

  it("inserts an empty pair at the caret, and takes it out on a second press", () => {
    const first = bolded("Hi ", 3, 3);
    expect(first).toEqual({ value: "Hi ****", start: 5, end: 5 });
    expect(bolded("Hi ****", 5, 5)).toEqual({ value: "Hi ", start: 3, end: 3 });
  });
});

describe("toggleBold on any text", () => {
  it("never changes what the text reads as, only which characters are bold", () => {
    // A fixed seed, so a failure reproduces.
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const alphabet = ["a", "b", " ", "*", "**", "\\", "\\*"];
    for (let run = 0; run < 3000; run++) {
      const value = Array.from(
        { length: 1 + Math.floor(random() * 10) },
        () => alphabet[Math.floor(random() * alphabet.length)],
      ).join("");
      const start = Math.floor(random() * (value.length + 1));
      const end = start + Math.floor(random() * (value.length - start + 1));
      const edit = toggleBold(value, start, end);
      if (!edit) continue;
      const next = applyEdit(value, edit);
      expect(plainText(next), JSON.stringify({ value, start, end, next })).toBe(plainText(value));
    }
  });
});
