import { describe, expect, it } from "vitest";

import {
  applyEdit,
  isBlank,
  parseBold,
  plainText,
  readableChars,
  toggleBold,
  widenEdit,
} from "#/lib/survey/rich-text";

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
    // Escaping one asterisk of the pair is enough to keep it from being a marker.
    expect(result?.value).toBe("5 *\\* 2 is **25**");
    expect(parseBold(result?.value ?? "")).toEqual([
      { text: "5 ** 2 is ", bold: false, start: 0 },
      { text: "25", bold: true, start: 13 },
    ]);
  });

  it("escapes only the stray ** before the edit, copying the text between as it is", () => {
    expect(boldWords("2 ** 3 times 4 * 5 is C:\\ bold", "bold")?.value).toBe(
      "2 *\\* 3 times 4 * 5 is C:\\ **bold**",
    );
  });

  it("leaves an unpaired ** after the edit as written", () => {
    expect(boldWords("bold me then 2 ** 3", "bold")?.value).toBe("**bold** me then 2 ** 3");
  });

  it("escapes nothing that could not join the edit", () => {
    expect(boldWords("b* c", "b")?.value).toBe("**b*** c");
    expect(plainText("**b*** c")).toBe("b* c");
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

  it("takes out an empty pair inside bold text on a second press", () => {
    const first = bolded("**abc**", 3, 3);
    expect(first).toEqual({ value: "**a****bc**", start: 5, end: 5 });
    expect(bolded("**a****bc**", 5, 5)).toEqual({ value: "**abc**", start: 3, end: 3 });
  });
});

describe("widenEdit, the fallback for an edit that came out wrong", () => {
  // A bold marker written straight after a lone backslash turns into an escape: `\**a**`.
  const value = "\\a";
  const unguarded = { from: 1, to: 2, insert: "**a**", start: 3, end: 4 };
  const isRight = (edit: typeof unguarded) => {
    const chars = readableChars(applyEdit(value, edit));
    return chars.map((c) => c.char).join("") === "\\a" && chars[1]?.bold === true;
  };

  it("takes in the neighbour that joined, escaped", () => {
    expect(isRight(unguarded)).toBe(false);
    const edit = widenEdit(value, unguarded, isRight);
    expect(edit && applyEdit(value, edit)).toBe("\\\\**a**");
  });

  it("gives up with null after its rounds, or when nothing is left to take in", () => {
    expect(widenEdit(value, unguarded, isRight, 0)).toBeNull();
    expect(widenEdit(value, unguarded, () => false)).toBeNull();
  });
});

describe("toggleBold on any text", () => {
  // A fixed seed, so a failure reproduces.
  let seed = 7;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)] as T;
  const messy = ["a", "b", " ", "*", "**", "***", "\\", "\\*", "\\\\"];
  // Every asterisk a marker, every marker paired, no empty pairs: text a second press restores.
  const tidy = ["a", "b", " ", "**"];

  it("changes only the selected characters' bold, keeps them selected, and undoes itself", () => {
    for (let run = 0; run < 5000; run++) {
      const isTidy = random() < 0.3;
      const value = Array.from({ length: 1 + Math.floor(random() * 12) }, () =>
        pick(isTidy ? tidy : messy),
      ).join("");
      const start = Math.floor(random() * (value.length + 1));
      const end =
        random() < 0.4 ? start : start + Math.floor(random() * (value.length - start + 1));
      const context = JSON.stringify({ value, start, end });

      const chars = readableChars(value);
      const selected =
        start === end ? [] : chars.filter((c) => c.at + c.length > start && c.at < end);
      const edit = toggleBold(value, start, end);
      if (!edit) {
        // Only a selection of markers alone is refused.
        expect(start !== end && selected.length === 0, context).toBe(true);
        continue;
      }
      const next = applyEdit(value, edit);
      const after = readableChars(next);

      // The same characters, and only the selected ones change bold, all the same way.
      expect(plainText(next), context).toBe(plainText(value));
      const bold = !selected.every((c) => c.bold);
      chars.forEach((c, i) => {
        expect(after[i]?.bold, context).toBe(selected.includes(c) ? bold : c.bold);
      });
      // The returned selection holds exactly the selected characters.
      const reselected = after.filter((c) => c.at >= edit.start && c.at < edit.end);
      expect(reselected.map((c) => c.char).join(""), context).toBe(
        selected.map((c) => c.char).join(""),
      );

      // Text outside the selection keeps its words as written. Besides markers, the edit may add
      // one backslash for an unpaired ** before it and one for a neighbour that would join a
      // marker, and none after the selection.
      const strip = (text: string) => text.replace(/[*\\]/g, "");
      const slashes = (text: string) => text.split("\\").length - 1;
      const head = { was: value.slice(0, start), now: next.slice(0, edit.start) };
      const tail = { was: value.slice(end), now: next.slice(edit.end) };
      expect(strip(head.now), context).toBe(strip(head.was));
      expect(strip(tail.now), context).toBe(strip(tail.was));
      expect(slashes(head.now) - slashes(head.was), context).toBeLessThanOrEqual(2);
      expect(slashes(tail.now) - slashes(tail.was), context).toBeLessThanOrEqual(0);

      // Pressing again on all-bold or all-plain words, or at the caret, brings them back.
      if (selected.some((c) => c.bold !== selected[0]?.bold)) continue;
      const again = toggleBold(next, edit.start, edit.end);
      const back = again ? applyEdit(next, again) : next;
      expect(
        readableChars(back).map((c) => c.bold),
        context,
      ).toEqual(chars.map((c) => c.bold));
      const paired = (value.match(/\*\*/g) ?? []).length % 2 === 0;
      if (isTidy && paired && !value.includes("****")) expect(back, context).toBe(value);
    }
  });
});
