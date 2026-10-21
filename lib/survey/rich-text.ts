// Printed text in a survey form can mark words bold with `**double asterisks**`. The builder's
// preview reads it through `parseBold`; the print layout and exports, when they are built, should
// read it the same way so all three agree. A marker without its pair prints as written.

/** A stretch of printed text, bold or not. */
export type TextRun = { text: string; bold: boolean };

export function parseBold(text: string): TextRun[] {
  const parts = text.split("**");
  // An even number of parts means the last marker has no pair; it stays in the text.
  if (parts.length % 2 === 0) {
    const unclosed = parts.pop() ?? "";
    parts[parts.length - 1] += `**${unclosed}`;
  }
  return parts
    .map((part, index) => ({ text: part, bold: index % 2 === 1 }))
    .filter((run) => run.text !== "");
}

/** The text as it reads, without bold markers, for summaries and exported labels. */
export function plainText(text: string) {
  return parseBold(text)
    .map((run) => run.text)
    .join("");
}

/**
 * Bolds the selected words of a text field's value, or un-bolds them when every selected
 * character is already bold. Markers inside or around the selection don't count as selected text,
 * so a selection that crosses bold and plain words, or takes in markers, still acts on the whole
 * selection. Returns the new value and the selection to restore, around the same words. With
 * nothing selected it inserts an empty pair, the caret between them.
 */
export function toggleBold(value: string, start: number, end: number) {
  if (start === end) {
    return {
      value: `${value.slice(0, start)}****${value.slice(end)}`,
      start: start + 2,
      end: start + 2,
    };
  }
  const chars = readableChars(value);
  const selected = chars.filter((c) => c.at >= start && c.at < end);
  if (selected.length === 0) {
    return { value, start, end };
  }
  const bold = !selected.every((c) => c.bold);
  for (const c of selected) {
    c.bold = bold;
  }

  // Write the text back with a marker wherever bold starts or stops, noting where the selected
  // characters land.
  let next = "";
  let open = false;
  let from = 0;
  let to = 0;
  for (const c of chars) {
    if (c.bold !== open) {
      next += "**";
      open = c.bold;
    }
    if (c === selected[0]) from = next.length;
    next += c.char;
    if (c === selected.at(-1)) to = next.length;
  }
  if (open) next += "**";
  return { value: next, start: from, end: to };
}

/** Every character of the text as it reads, with its position in `value` and whether it is bold. */
function readableChars(value: string) {
  const chars: { char: string; at: number; bold: boolean }[] = [];
  let at = 0;
  for (const run of parseBold(value)) {
    // parseBold drops paired markers, so find each run where it sits in the raw text.
    at = value.indexOf(run.text, at);
    for (const char of run.text) {
      chars.push({ char, at, bold: run.bold });
      at += char.length;
    }
  }
  return chars;
}
