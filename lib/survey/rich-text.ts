// Printed text in a survey form can mark words bold with `**double asterisks**`. `\*` is a literal
// asterisk and `\\` a literal backslash; any other backslash or lone asterisk prints as written,
// and so does a final `**` without its pair. The builder's preview reads text through
// `parseBold`; the print layout and exports, when they are built, should read it the same way so
// all three agree.

/** A stretch of printed text, bold or not, and where it starts in the raw text. */
export type TextRun = { text: string; bold: boolean; start: number };

/** One readable character, or a bold marker, as it sits in the raw text. */
type Token =
  | { kind: "char"; char: string; at: number; length: number; bold: boolean }
  | { kind: "marker"; at: number; length: 2; bold: boolean };

/** The raw text as tokens; `bold` is the state where each token starts. */
function scan(text: string) {
  const raw: { kind: "char" | "marker"; char: string; at: number; length: number }[] = [];
  for (let at = 0; at < text.length;) {
    const pair = text.slice(at, at + 2);
    if (pair === "\\*" || pair === "\\\\") {
      raw.push({ kind: "char", char: pair[1] ?? "", at, length: 2 });
      at += 2;
    } else if (pair === "**") {
      raw.push({ kind: "marker", char: "", at, length: 2 });
      at += 2;
    } else {
      const char = text[at] ?? "";
      raw.push({ kind: "char", char, at, length: 1 });
      at += 1;
    }
  }
  // A final marker without a pair is two literal asterisks.
  const markers = raw.filter((t) => t.kind === "marker");
  const unpaired = markers.length % 2 === 1 ? markers.at(-1) : undefined;

  const tokens: Token[] = [];
  let bold = false;
  for (const t of raw) {
    if (t === unpaired) {
      tokens.push({ kind: "char", char: "*", at: t.at, length: 1, bold });
      tokens.push({ kind: "char", char: "*", at: t.at + 1, length: 1, bold });
    } else if (t.kind === "marker") {
      tokens.push({ kind: "marker", at: t.at, length: 2, bold });
      bold = !bold;
    } else {
      tokens.push({ kind: "char", char: t.char, at: t.at, length: t.length, bold });
    }
  }
  return { tokens, endBold: bold, unpairedAt: unpaired?.at };
}

export function parseBold(text: string): TextRun[] {
  const runs: TextRun[] = [];
  for (const token of scan(text).tokens) {
    if (token.kind === "marker") continue;
    const last = runs.at(-1);
    if (last && last.bold === token.bold) {
      last.text += token.char;
    } else {
      runs.push({ text: token.char, bold: token.bold, start: token.at });
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

/** A change to a text field: `insert` replaces `from` to `to`; then `start` to `end` is selected. */
export type TextEdit = { from: number; to: number; insert: string; start: number; end: number };

/** The text after an edit. */
export function applyEdit(value: string, edit: TextEdit) {
  return value.slice(0, edit.from) + edit.insert + value.slice(edit.to);
}

/**
 * Bolds the selected words, or un-bolds them when every selected character is already bold. The
 * edit stays inside the selection, widened to whole markers and escapes, and keeps the bold state
 * at both of its ends, so markup elsewhere reads as before. It escapes asterisks and backslashes
 * it writes, and takes in a literal one beside a marker it adds, so the result reads back exactly.
 *
 * With nothing selected it adds an empty pair, the caret between; with the caret already in an
 * empty pair it takes the pair out. Returns null when the selection holds no readable text.
 */
export function toggleBold(value: string, start: number, end: number): TextEdit | null {
  const { tokens, endBold, unpairedAt } = scan(value);
  if (start === end) {
    // A caret inside a marker or an escape moves past it, so the pair never splits one.
    const inside = tokens.find((t) => t.at < start && start < t.at + t.length);
    if (inside) return toggleBold(value, inside.at + inside.length, inside.at + inside.length);
    const before = tokens.find((t) => t.at === start - 2);
    const after = tokens.find((t) => t.at === start);
    if (before?.kind === "marker" && after?.kind === "marker" && !before.bold) {
      return { from: start - 2, to: start + 2, insert: "", start: start - 2, end: start - 2 };
    }
    return finish(value, tokens, unpairedAt, {
      from: start,
      to: start,
      insert: "****",
      start: start + 2,
      end: start + 2,
    });
  }

  // The tokens the selection touches, whole.
  let first = tokens.findIndex((t) => t.at + t.length > start);
  let last = tokens.findLastIndex((t) => t.at < end);
  if (first === -1 || last < first) return null;
  const selected = tokens.slice(first, last + 1).filter((t) => t.kind === "char");
  if (selected.length === 0) return null;

  const boldIn = tokens[first]?.bold ?? false;
  const boldOut = tokens[last + 1]?.bold ?? endBold;
  const bold = !selected.every((t) => t.bold);

  // A marker this would add beside an existing one cancels it instead: both flip the state.
  const openMarker = boldIn !== bold && tokens[first - 1]?.kind !== "marker";
  const closeMarker = bold !== boldOut && tokens[last + 1]?.kind !== "marker";
  if (boldIn !== bold && !openMarker) first -= 1;
  if (bold !== boldOut && !closeMarker) last += 1;
  // A literal asterisk after a marker this adds would join it, so it is rewritten, escaped, as
  // part of the edit. One before the edit is guardStart's.
  const after = tokens[last + 1];
  const trailing = closeMarker && after?.kind === "char" && after.char === "*" ? after : undefined;
  if (trailing) last += 1;

  const from = tokens[first]?.at ?? start;
  const lastToken = tokens[last];
  const to = lastToken ? lastToken.at + lastToken.length : end;
  let insert = openMarker ? "**" : "";
  const selectStart = from + insert.length;
  insert += selected.map((t) => escape(t.char)).join("");
  const selectEnd = from + insert.length;
  if (closeMarker) insert += "**";
  if (trailing) insert += escape(trailing.char);

  return finish(value, tokens, unpairedAt, {
    from,
    to,
    insert,
    start: selectStart,
    end: selectEnd,
  });
}

/**
 * Makes an edit safe against the text around it: the character just before it, and a stray
 * unpaired `**`, along with the character just before that once the edit reaches it.
 */
function finish(value: string, tokens: Token[], stray: number | undefined, edit: TextEdit) {
  return guardStart(tokens, escapeStray(value, stray, guardStart(tokens, edit)));
}

const escape = (char: string) => (char === "*" || char === "\\" ? `\\${char}` : char);

/**
 * A lone literal asterisk or backslash just before an edit would join what the edit starts with
 * (a marker, or an escape), so the edit takes it in, escaped.
 */
function guardStart(tokens: Token[], edit: TextEdit): TextEdit {
  const before = tokens.find((t) => t.at + t.length === edit.from);
  if (
    before?.kind !== "char" ||
    before.length !== 1 ||
    (before.char !== "*" && before.char !== "\\")
  ) {
    return edit;
  }
  return {
    from: before.at,
    to: edit.to,
    insert: escape(before.char) + edit.insert,
    start: edit.start + 1,
    end: edit.end + 1,
  };
}

/**
 * An edit that adds markers to text holding an unpaired `**` would pair the new marker with it,
 * so the edit takes it in, escaped. A stray inside the edit was escaped with the rest.
 */
function escapeStray(value: string, stray: number | undefined, edit: TextEdit): TextEdit {
  if (stray === undefined) return edit;
  const escaped = "\\*\\*";
  if (stray + 2 <= edit.from) {
    const prefix = escaped + value.slice(stray + 2, edit.from);
    const shift = prefix.length - (edit.from - stray);
    return {
      from: stray,
      to: edit.to,
      insert: prefix + edit.insert,
      start: edit.start + shift,
      end: edit.end + shift,
    };
  }
  if (stray >= edit.to) {
    return { ...edit, to: stray + 2, insert: edit.insert + value.slice(edit.to, stray) + escaped };
  }
  return edit;
}
