// Printed text in a survey form can mark words bold with `**double asterisks**`. `\*` is a literal
// asterisk and `\\` a literal backslash; any other backslash or lone asterisk prints as written,
// and so does a final `**` without its pair. The builder's preview reads text through
// `parseBold`; the print layout and exports, when they are built, should read it the same way so
// all three agree.

/** A stretch of printed text, bold or not, and where it starts in the raw text. */
export type TextRun = { text: string; bold: boolean; start: number };

/** The readable characters of the raw text, each with its position and whether it is bold. */
function scan(text: string) {
  const tokens: { marker: boolean; char: string; at: number }[] = [];
  for (let at = 0; at < text.length;) {
    const pair = text.slice(at, at + 2);
    if (pair === "\\*" || pair === "\\\\") {
      tokens.push({ marker: false, char: pair[1] ?? "", at });
      at += 2;
    } else if (pair === "**") {
      tokens.push({ marker: true, char: "", at });
      at += 2;
    } else {
      tokens.push({ marker: false, char: text[at] ?? "", at });
      at += 1;
    }
  }
  // A final marker without a pair is two literal asterisks.
  const markers = tokens.filter((t) => t.marker);
  const unpaired = markers.length % 2 === 1 ? markers.at(-1) : undefined;

  const chars: { char: string; at: number; bold: boolean }[] = [];
  let bold = false;
  for (const t of tokens) {
    if (t === unpaired) {
      chars.push({ char: "*", at: t.at, bold }, { char: "*", at: t.at + 1, bold });
    } else if (t.marker) {
      bold = !bold;
    } else {
      chars.push({ char: t.char, at: t.at, bold });
    }
  }
  return chars;
}

export function parseBold(text: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const { char, at, bold } of scan(text)) {
    const last = runs.at(-1);
    if (last?.bold === bold) {
      last.text += char;
    } else {
      runs.push({ text: char, bold, start: at });
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
