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
  return { tokens, endBold: bold };
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
 * edit covers the selection, widened to whole markers and escapes, and keeps the bold state at
 * both of its ends, so markup elsewhere reads as before; a marker it would add beside an existing
 * one cancels that one instead. It escapes the asterisks and backslashes it writes, so it undoes
 * itself.
 *
 * With nothing selected it adds an empty pair, the caret between; with the caret already between
 * two markers it takes them out. Returns null when the selection holds no readable text.
 */
export function toggleBold(value: string, start: number, end: number): TextEdit | null {
  const { tokens, endBold } = scan(value);
  const chars = readable(tokens);

  if (start === end) {
    // A caret inside a marker or an escape moves past it, so the pair never splits one.
    const inside = tokens.find((t) => t.at < start && start < t.at + t.length);
    if (inside) return toggleBold(value, inside.at + inside.length, inside.at + inside.length);
    const before = tokens.find((t) => t.at === start - 2);
    const after = tokens.find((t) => t.at === start);
    if (before?.kind === "marker" && after?.kind === "marker") {
      const remove = {
        from: start - 2,
        to: start + 2,
        insert: "",
        start: start - 2,
        end: start - 2,
      };
      return settle(value, tokens, remove, chars, () => true);
    }
    const add = { from: start, to: start, insert: "****", start: start + 2, end: start + 2 };
    // The caret must end up between the two new markers, so a second press finds them.
    return settle(value, tokens, add, chars, (result, edit) => {
      const isMarker = (at: number) => result.some((t) => t.kind === "marker" && t.at === at);
      return isMarker(edit.start - 2) && isMarker(edit.start);
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

  const from = tokens[first]?.at ?? start;
  const lastToken = tokens[last];
  const to = lastToken ? lastToken.at + lastToken.length : end;
  let insert = openMarker ? "**" : "";
  const selectStart = from + insert.length;
  insert += selected.map((t) => escape(t.char)).join("");
  const selectEnd = from + insert.length;
  if (closeMarker) insert += "**";

  const expected = chars.map((c) => (selected.includes(c) ? { ...c, bold } : c));
  const selectedText = selected.map((t) => t.char).join("");
  // The selection must still hold exactly the selected words, without splitting a token.
  return settle(
    value,
    tokens,
    { from, to, insert, start: selectStart, end: selectEnd },
    expected,
    (result, edit) =>
      result.every((t) => t.at + t.length <= edit.start || t.at >= edit.start) &&
      result.every((t) => t.at + t.length <= edit.end || t.at >= edit.end) &&
      readable(result)
        .filter((t) => t.at >= edit.start && t.at < edit.end)
        .map((t) => t.char)
        .join("") === selectedText,
  );
}

const escape = (char: string) => (char === "*" || char === "\\" ? `\\${char}` : char);

/** The readable characters among the tokens. */
function readable(tokens: Token[]) {
  return tokens.filter((t): t is Extract<Token, { kind: "char" }> => t.kind === "char");
}

/**
 * Widens an edit until the text reads as `expected` and has the shape `shaped` asks for. Text
 * next to an edit can join what it writes: a lone `\` before a marker turns it into an escape, a
 * lone `*` beside a marker makes a different marker, and an unpaired `**` before it pairs with
 * the new marker. Each round rescans the result, and where it first goes wrong, takes the
 * neighbouring token on that side into the edit, rewritten escaped. Nothing else changes.
 */
function settle(
  value: string,
  tokens: Token[],
  edit: TextEdit,
  expected: { char: string; bold: boolean }[],
  shaped: (result: Token[], edit: TextEdit) => boolean,
): TextEdit {
  let { from, to, insert, start, end } = edit;
  for (;;) {
    const current = { from, to, insert, start, end };
    const result = scan(applyEdit(value, current)).tokens;
    // Where the text first reads wrong, widen on that side. When it reads right but is shaped
    // wrong, a neighbour on either side may be joining, so take in one from each.
    const wrong = firstDifference(readable(result), expected);
    if (wrong === -1 && shaped(result, current)) return current;
    const left = tokens.find((t) => t.at + t.length === from);
    const right = tokens.find((t) => t.at === to);
    if (!left && !right) return current; // every token rewritten; can't be reached
    const readableBefore = tokens.filter((t) => t.kind === "char" && t.at < from).length;
    const takeLeft = left && (wrong === -1 || wrong <= readableBefore || !right);
    const takeRight = right && (wrong === -1 || !takeLeft);
    if (takeLeft) {
      const rewritten = rewrite(left);
      insert = rewritten + insert;
      start += rewritten.length - left.length;
      end += rewritten.length - left.length;
      from = left.at;
    }
    if (takeRight) {
      insert += rewrite(right);
      to = right.at + right.length;
    }
  }
}

function rewrite(token: Token) {
  return token.kind === "marker" ? "**" : escape(token.char);
}

function firstDifference(actual: { char: string; bold: boolean }[], expected: typeof actual) {
  const length = Math.max(actual.length, expected.length);
  for (let i = 0; i < length; i++) {
    if (actual[i]?.char !== expected[i]?.char || actual[i]?.bold !== expected[i]?.bold) return i;
  }
  return -1;
}
