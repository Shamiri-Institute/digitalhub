// Printed text in a survey form can mark words bold with `**double asterisks**`. `\*` is a literal
// asterisk and `\\` a literal backslash; any other backslash or lone asterisk prints as written,
// and so does a final `**` without its pair. The builder's preview reads text through
// `parseBold`; the print layout and exports, when they are built, should read it the same way so
// all three agree.

/** A stretch of printed text, bold or not. */
export type TextRun = { text: string; bold: boolean };

/** The readable characters of the raw text, each with whether it is bold. */
function scan(text: string) {
  const tokens: { marker: boolean; char: string }[] = [];
  for (let at = 0; at < text.length;) {
    const pair = text.slice(at, at + 2);
    if (pair === "\\*" || pair === "\\\\") {
      tokens.push({ marker: false, char: pair[1] ?? "" });
      at += 2;
    } else if (pair === "**") {
      tokens.push({ marker: true, char: "" });
      at += 2;
    } else {
      tokens.push({ marker: false, char: text[at] ?? "" });
      at += 1;
    }
  }
  // A final marker without a pair is two literal asterisks.
  const markers = tokens.filter((t) => t.marker);
  const unpaired = markers.length % 2 === 1 ? markers.at(-1) : undefined;

  const chars: { char: string; bold: boolean }[] = [];
  let bold = false;
  for (const t of tokens) {
    if (t === unpaired) {
      chars.push({ char: "**", bold });
    } else if (t.marker) {
      bold = !bold;
    } else {
      chars.push({ char: t.char, bold });
    }
  }
  return chars;
}

export function parseBold(text: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const { char, bold } of scan(text)) {
    const last = runs.at(-1);
    if (last?.bold === bold) {
      last.text += char;
    } else {
      runs.push({ text: char, bold });
    }
  }
  return runs;
}

/** The text as it reads, without markers or escapes, for summaries and exported labels. */
export function plainText(text: string | TextRun[]) {
  const runs = typeof text === "string" ? parseBold(text) : text;
  return runs.map((run) => run.text).join("");
}

/** Whether the text reads as nothing: empty, spaces, or markers alone. */
export function isBlank(text: string | TextRun[]) {
  return plainText(text).trim() === "";
}
