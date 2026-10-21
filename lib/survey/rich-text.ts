// Printed text in a survey form can mark words bold with `**double asterisks**`. The builder's
// preview and the print layout both read it through `parseBold`, so they always agree. A marker
// without its pair prints as written.

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
 * Bolds or un-bolds the selected part of a text field's value. Returns the new value and the
 * selection to restore. With nothing selected it inserts an empty pair, the caret between them.
 */
export function toggleBold(value: string, start: number, end: number) {
  if (start === end) {
    return {
      value: `${value.slice(0, start)}****${value.slice(end)}`,
      start: start + 2,
      end: start + 2,
    };
  }
  const wrapped = value.slice(start - 2, start) === "**" && value.slice(end, end + 2) === "**";
  if (wrapped) {
    return {
      value: value.slice(0, start - 2) + value.slice(start, end) + value.slice(end + 2),
      start: start - 2,
      end: end - 2,
    };
  }
  return {
    value: `${value.slice(0, start)}**${value.slice(start, end)}**${value.slice(end)}`,
    start: start + 2,
    end: end + 2,
  };
}
