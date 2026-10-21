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

/** Every readable character of the text, where it sits in the raw text, and whether it is bold. */
export function readableChars(text: string) {
  return readable(scan(text).tokens).map(({ char, at, length, bold }) => ({
    char,
    at,
    length,
    bold,
  }));
}

/**
 * Bolds the selected words, or un-bolds them when every selected character is already bold. The
 * edit covers the selection, widened to whole markers and escapes, and keeps the bold state at
 * both of its ends, so markup elsewhere reads as before; a marker it would add beside an existing
 * one cancels that one instead. It escapes the asterisks and backslashes it writes, so it undoes
 * itself.
 *
 * With nothing selected it adds an empty pair, the caret between; with the caret already between
 * two markers it takes them out. Returns null when the selection holds no readable text, or when
 * the edit would not read as intended, so the field is left alone.
 */
export function toggleBold(value: string, start: number, end: number): TextEdit | null {
  const scanned = scan(value);
  const { tokens, endBold } = scanned;
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
      return checked(value, remove, chars, () => true);
    }
    const add = guard(value, scanned, {
      from: start,
      to: start,
      insert: "****",
      start: start + 2,
      end: start + 2,
    });
    // The caret must sit between the two new markers, so a second press finds them.
    return checked(value, add, chars, (result, edit) => {
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

  const edit = guard(value, scanned, { from, to, insert, start: selectStart, end: selectEnd });
  const isSelected = new Set(selected);
  const expected = chars.map((c) => (isSelected.has(c) ? { ...c, bold } : c));
  const selectedText = selected.map((t) => t.char).join("");
  // The selection must still hold exactly the selected words, without splitting a token.
  return checked(
    value,
    edit,
    expected,
    (result, e) =>
      result.every((t) => t.at + t.length <= e.start || t.at >= e.start) &&
      result.every((t) => t.at + t.length <= e.end || t.at >= e.end) &&
      readable(result)
        .filter((t) => t.at >= e.start && t.at < e.end)
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
 * Keeps the text around an edit from joining what it writes, by looking only at its neighbours.
 * Tokens are read left to right and the edit ends on a whole token, so only the left side can
 * join: a lone `\` before an edit starting with `*` or `\` makes an escape, and a lone `*` before
 * one starting with `*` makes a different marker; that token is rewritten, escaped, in the edit.
 * And an unpaired `**` before the edit would pair with a marker it adds, since it is always the
 * last marker; escaping one of its asterisks keeps it literal, with the text between copied as is.
 */
function guard(value: string, { tokens, unpairedAt }: ReturnType<typeof scan>, edit: TextEdit) {
  let { from, insert, start, end } = edit;
  const left = tokens.find((t) => t.at + t.length === from);
  const strayBefore = unpairedAt !== undefined && unpairedAt + 2 <= from ? unpairedAt : undefined;
  const joins =
    left?.kind === "char" &&
    left.length === 1 &&
    ((left.char === "\\" && /^[*\\]/.test(insert)) ||
      (left.char === "*" && insert.startsWith("*")));
  // A stray's own asterisk next to the edit is handled with the stray.
  if (joins && (strayBefore === undefined || left.at >= strayBefore + 2)) {
    insert = escape(left.char) + insert;
    start += 1;
    end += 1;
    from = left.at;
  }
  if (strayBefore !== undefined) {
    const prefix = `*\\*${value.slice(strayBefore + 2, from)}`;
    const shift = prefix.length - (from - strayBefore);
    insert = prefix + insert;
    start += shift;
    end += shift;
    from = strayBefore;
  }
  return { from, to: edit.to, insert, start, end };
}

/**
 * The edit, once a rescan of the result confirms it reads as `expected` and has the shape
 * `shaped` asks for. If the neighbour rules above ever miss a case, the edit is widened instead
 * (see `widenEdit`), so the button gives a wider edit rather than doing nothing; only when that
 * fails too is the answer null and the field left as it was.
 */
function checked(
  value: string,
  edit: TextEdit,
  expected: { char: string; bold: boolean }[],
  shaped: (result: Token[], edit: TextEdit) => boolean,
): TextEdit | null {
  const isRight = (candidate: TextEdit) => {
    const result = scan(applyEdit(value, candidate)).tokens;
    const actual = readable(result);
    return (
      actual.length === expected.length &&
      actual.every((c, i) => c.char === expected[i]?.char && c.bold === expected[i]?.bold) &&
      shaped(result, candidate)
    );
  };
  return isRight(edit) ? edit : widenEdit(value, edit, isRight);
}

/**
 * A fallback for an edit that came out wrong: takes in one neighbouring token on each side,
 * rewritten escaped, and tries again, for at most `rounds` rounds. Returns the first edit
 * `isRight` accepts, or null.
 */
export function widenEdit(
  value: string,
  edit: TextEdit,
  isRight: (edit: TextEdit) => boolean,
  rounds = 8,
): TextEdit | null {
  const { tokens } = scan(value);
  let { from, to, insert, start, end } = edit;
  for (let round = 0; round < rounds; round++) {
    const left = tokens.find((t) => t.at + t.length === from);
    const right = tokens.find((t) => t.at === to);
    if (!left && !right) return null;
    if (left) {
      const rewritten = left.kind === "marker" ? "**" : escape(left.char);
      insert = rewritten + insert;
      start += rewritten.length - left.length;
      end += rewritten.length - left.length;
      from = left.at;
    }
    if (right) {
      insert += right.kind === "marker" ? "**" : escape(right.char);
      to = right.at + right.length;
    }
    const candidate = { from, to, insert, start, end };
    if (isRight(candidate)) return candidate;
  }
  return null;
}
