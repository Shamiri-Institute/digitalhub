// The print layout engine: where everything on a printed page of a survey version sits. Publishing
// stores its output on the version, and from then on that layout is what prints and where the
// scanner looks for answers. The builder preview and the PDF only paint a layout; neither measures
// or breaks text, so they can't disagree with each other or with the scanner.
//
// Every length is in PDF points (1/72 in) from the page's top-left corner, y growing down; a text
// run's y is its baseline. Runs on server and client alike, so it must not import the database.

import { SurveyVersionPrefill } from "#/db/enums";
import { isQuestion, type SurveyForm, type SurveyItem } from "#/lib/survey/form";
import { isBlank, plainText } from "#/lib/survey/rich-text";
import {
  breakText,
  CAP_HEIGHT,
  type FontWeight,
  measure,
  normalizeText,
  roundPt,
  type TextStyle,
  unprintableChar,
} from "#/lib/survey/text-metrics";

export type { FontWeight };

/** Bump when a change to this file moves anything on the page; stored beside each layout. */
export const LAYOUT_ENGINE_VERSION = 1;

export type Prefill = SurveyVersionPrefill;
export type Rect = { x: number; y: number; w: number; h: number };

export type HeaderSlotId = "serial" | "school" | "studentName" | "studentId";

/** The header fields each copy fills in, per prefill. Copy values and header slots follow it. */
export const PREFILL_HEADER_SLOTS = {
  NONE: ["serial"],
  SCHOOL: ["serial", "school"],
  STUDENT: ["serial", "studentName", "studentId"],
} as const satisfies Record<Prefill, readonly HeaderSlotId[]>;

/** What one printed copy fills into its header. */
export type CopyValues<P extends Prefill> = P extends Prefill
  ? { [K in (typeof PREFILL_HEADER_SLOTS)[P][number]]: string }
  : never;

/** Text already broken and placed. */
export type TextRun = {
  x: number;
  baseline: number;
  size: number;
  weight: FontWeight;
  text: string;
  width: number;
};

export type Drawable =
  | { kind: "text"; run: TextRun }
  | { kind: "rect"; rect: Rect; stroke: number }
  | { kind: "circle"; cx: number; cy: number; r: number; stroke: number }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; stroke: number; dotted?: true };

/**
 * Where a per-copy header value prints. Values longer than `maxWidth` shrink down to `minSize`,
 * then shorten.
 */
export type HeaderSlot = {
  slot: HeaderSlotId;
  label: TextRun;
  value: {
    x: number;
    baseline: number;
    size: number;
    minSize: number;
    weight: FontWeight;
    maxWidth: number;
  };
};

/** One answer field: a question, or one grid row (`${key}.${row.key}`). The scanner reads these. */
export type ResponseField = { field: string; questionId: string } & (
  | { kind: "choice"; multiple: boolean; mark: "circle" | "square"; marks: ChoiceMark[] }
  | { kind: "digits"; cells: Rect[] }
  | { kind: "date"; day: Rect[]; month: Rect[]; year: Rect[] }
  | { kind: "text"; area: Rect; lines: number }
  | { kind: "signature"; area: Rect }
);
export type ChoiceMark = { code: string; box: Rect };

export type LayoutPage = {
  /** The form's page position, from 1. */
  number: number;
  markers: { topLeft: Rect; bottomLeft: Rect; bottomRight: Rect };
  qr: Rect;
  /** Exactly the prefill's header slots, in order. */
  header: HeaderSlot[];
  /**
   * Everything printed on the page but the header values: text, rules, and the marks, cells and
   * lines answers go in, drawn from `fields` when the page is laid out. Stored whole, so a
   * published version prints the same ink however the engine changes later.
   */
  content: Drawable[];
  fields: ResponseField[];
  /**
   * Each item's extent, in order; items that don't fit end below the content box. A heading,
   * paragraph or question with blank text keeps one line, where the builder shows `standIn` in
   * grey. Publishing refuses blank text, so a stored layout never has one.
   */
  items: { itemId: string; box: Rect; standIn?: TextRun }[];
};

export type LayoutOf<P extends Prefill> = {
  prefill: P;
  unit: "pt";
  origin: "top-left";
  paper: { name: "A4"; width: number; height: number };
  pages: LayoutPage[];
};
export type Layout = { [P in Prefill]: LayoutOf<P> }[Prefill];

export type LayoutProblem =
  /** Items whose bottom passes the content box, and by how much the lowest one does. */
  | { kind: "overflow"; page: number; itemIds: string[]; overBy: number }
  /** A grid whose option columns leave too little room for its row labels or headers. */
  | { kind: "too_wide"; page: number; itemId: string }
  | { kind: "unprintable"; page: number; itemId: string; char: string }
  | { kind: "unprintable_title"; page: number; char: string };

const PAPER = { width: 595.28, height: 841.89 };
const INSET = 24;
const MARKER = 15;
/** Blank space kept around each corner marker for the scanner. Not yet confirmed by its team. */
const QUIET_ZONE = 6;
const QR = 54;
const CONTENT = {
  left: INSET,
  right: PAPER.width - INSET,
  top: 90,
  bottom: PAPER.height - INSET - MARKER - QUIET_ZONE,
};
const CONTENT_WIDTH = CONTENT.right - CONTENT.left;
/** The header band, between the top-left marker and the QR code, each with its quiet zone. */
const HEADER = { left: INSET + MARKER + QUIET_ZONE, right: PAPER.width - INSET - QR - QUIET_ZONE };

type Style = TextStyle & { lineHeight: number };
const STYLES = {
  heading: { size: 15, lineHeight: 19, weight: 700, boldWeight: 700 },
  paragraph: { size: 10.5, lineHeight: 15, weight: 400, boldWeight: 700 },
  prompt: { size: 10.5, lineHeight: 14, weight: 600, boldWeight: 700 },
  help: { size: 9, lineHeight: 12, weight: 400, boldWeight: 700 },
  option: { size: 10, lineHeight: 13, weight: 400, boldWeight: 700 },
  gridHeader: { size: 8, lineHeight: 10, weight: 600, boldWeight: 700 },
  hint: { size: 7, lineHeight: 9, weight: 400, boldWeight: 700 },
  pageLabel: { size: 8, lineHeight: 10, weight: 600, boldWeight: 700 },
  pageTitle: { size: 8, lineHeight: 10, weight: 400, boldWeight: 400 },
  slotLabel: { size: 7, lineHeight: 9, weight: 600, boldWeight: 600 },
  slotValue: { size: 9, lineHeight: 11, weight: 400, boldWeight: 400 },
} as const satisfies Record<string, Style>;

/** The smallest a header value shrinks to before it is shortened. */
const MIN_VALUE_SIZE = 6;

/** Fixed places for every slot, so a page's fit never depends on the prefill. */
const SLOT_BOXES: Record<HeaderSlotId, { x: number; width: number }> = {
  serial: { x: HEADER.left, width: 120 },
  school: { x: HEADER.left + 130, width: HEADER.right - HEADER.left - 130 },
  studentName: { x: HEADER.left + 130, width: 220 },
  studentId: { x: HEADER.left + 360, width: HEADER.right - HEADER.left - 360 },
};
const SLOT_LABELS: Record<HeaderSlotId, string> = {
  serial: "Serial",
  school: "School",
  studentName: "Student",
  studentId: "Student ID",
};
const SAMPLE_VALUES: Record<HeaderSlotId, string> = {
  serial: "SAMPLE",
  school: "School name",
  studentName: "Student name",
  studentId: "Student ID",
};

const CHOICE = { mark: 10, labelGap: 5, across: 24, down: 7.5 };
const RATING = { box: 14, labelGap: 3, across: 24 };
const GRID = { minColumn: 30, maxColumn: 60, minLabel: 72, headerLines: 3, rowPadding: 6 };
const CELL = { w: 18, h: 24, gap: 3, groupGap: 9 };
const TEXT_LINE_GAP = 27;
const SIGNATURE_HEIGHT = 60;

/**
 * Lays out every page of the form on A4 portrait. Pure and synchronous: the same form gives the
 * same layout on any machine. Never throws for a valid form; every reason a page can't print is in
 * `problems`, and the layout still holds every item so the preview can show what doesn't fit.
 */
export function layOutForm<P extends Prefill>(
  form: SurveyForm,
  prefill: P,
): { layout: LayoutOf<P>; problems: LayoutProblem[] } {
  const problems: LayoutProblem[] = [];
  const pages = form.pages.map((page, index): LayoutPage => {
    const number = index + 1;
    const content = pageHeading(number, form.pages.length, page.title);
    const titleChar = unprintableChar(oneLine(plainText(page.title ?? "")));
    if (titleChar) {
      problems.push({ kind: "unprintable_title", page: number, char: titleChar });
    }
    const fields: ResponseField[] = [];
    const items: LayoutPage["items"] = [];

    let cursor = CONTENT.top;
    let previous: SurveyItem | undefined;
    for (const item of page.items) {
      const top = cursor + gapBefore(item, previous);
      const block = layOutItem(item, top);
      content.push(...block.content, ...block.fields.flatMap(fieldInk));
      fields.push(...block.fields);
      items.push({
        itemId: item.id,
        box: rect(CONTENT.left, top, CONTENT_WIDTH, block.bottom - top),
        ...(block.standIn && { standIn: block.standIn }),
      });
      if (block.tooWide) {
        problems.push({ kind: "too_wide", page: number, itemId: item.id });
      }
      const char = itemText(item)
        .map(unprintableChar)
        .find((c) => c !== undefined);
      if (char) {
        problems.push({ kind: "unprintable", page: number, itemId: item.id, char });
      }
      cursor = block.bottom;
      previous = item;
    }

    const overflowing = items.filter(({ box }) => box.y + box.h > CONTENT.bottom + 0.005);
    if (overflowing.length > 0) {
      problems.push({
        kind: "overflow",
        page: number,
        itemIds: overflowing.map((i) => i.itemId),
        overBy: roundPt(cursor - CONTENT.bottom),
      });
    }

    return {
      number,
      markers: {
        topLeft: rect(INSET, INSET, MARKER, MARKER),
        bottomLeft: rect(INSET, PAPER.height - INSET - MARKER, MARKER, MARKER),
        bottomRight: rect(
          PAPER.width - INSET - MARKER,
          PAPER.height - INSET - MARKER,
          MARKER,
          MARKER,
        ),
      },
      qr: rect(PAPER.width - INSET - QR, INSET, QR, QR),
      header: PREFILL_HEADER_SLOTS[prefill].map(headerSlot),
      content,
      fields,
      items,
    };
  });

  return {
    layout: {
      prefill,
      unit: "pt",
      origin: "top-left",
      paper: { name: "A4", ...PAPER },
      pages,
    },
    problems,
  };
}

/** Stand-in header values for the preview and the sample PDF. */
export function sampleCopy<L extends Layout>(layout: L): CopyValues<L["prefill"]> {
  return Object.fromEntries(
    PREFILL_HEADER_SLOTS[layout.prefill].map((slot) => [slot, SAMPLE_VALUES[slot]]),
  ) as CopyValues<L["prefill"]>;
}

/** A copy's value for a header slot, shrunk and then shortened until it fits its slot. */
export function headerValueRun(slot: HeaderSlot, copy: CopyValues<Prefill>): TextRun {
  const raw = (copy as Partial<Record<HeaderSlotId, string>>)[slot.slot] ?? "";
  // Values come from school and student records, not the form, so nobody can fix them before
  // printing. A character the font lacks is left out: drawn, it would print wider than measured.
  const text = Array.from(oneLine(raw))
    .filter((char) => unprintableChar(char) === undefined)
    .join("");
  const { x, baseline, weight, minSize } = slot.value;
  return { x, baseline, weight, ...fitText(text, slot.value, minSize) };
}

/**
 * Text set on one line as printed: tabs, line breaks and unusual spaces become single spaces,
 * since a line measured without them must print without them.
 */
function oneLine(text: string) {
  return normalizeText(text).replaceAll(/\s+/g, " ").trim();
}

/** Text on one line (see `oneLine`) within `maxWidth`: smaller down to `minSize`, then cut short with "…". */
function fitText(
  raw: string,
  { size, weight, maxWidth }: { size: number; weight: FontWeight; maxWidth: number },
  minSize: number,
) {
  const text = oneLine(raw);
  let fittedSize = size;
  while (fittedSize > minSize && measure(text, weight, fittedSize) > maxWidth) {
    fittedSize -= 0.5;
  }
  const chars = Array.from(text);
  let kept = chars.length;
  let fitted = text;
  while (kept > 1 && measure(fitted, weight, fittedSize) > maxWidth) {
    kept -= 1;
    fitted = `${chars.slice(0, kept).join("").trimEnd()}…`;
  }
  return { size: fittedSize, text: fitted, width: roundPt(measure(fitted, weight, fittedSize)) };
}

/** The marks, cells and lines an answer goes in. */
function fieldInk(field: ResponseField): Drawable[] {
  switch (field.kind) {
    case "choice":
      return field.marks.map(({ box }) =>
        field.mark === "circle"
          ? {
              kind: "circle",
              cx: box.x + box.w / 2,
              cy: box.y + box.h / 2,
              r: box.w / 2,
              stroke: 1,
            }
          : { kind: "rect", rect: box, stroke: 1 },
      );
    case "digits":
      return field.cells.map(cellInk);
    case "date":
      return [...field.day, ...field.month, ...field.year].map(cellInk);
    case "text": {
      const { area, lines } = field;
      return Array.from({ length: lines }, (_, i) => {
        const y = roundPt(area.y + ((i + 1) * area.h) / lines);
        return {
          kind: "line",
          x1: area.x,
          y1: y,
          x2: area.x + area.w,
          y2: y,
          stroke: 0.75,
          dotted: true,
        };
      });
    }
    case "signature":
      return [{ kind: "rect", rect: field.area, stroke: 0.75 }];
  }
}

function cellInk(cell: Rect): Drawable {
  return { kind: "rect", rect: cell, stroke: 0.75 };
}

/** The "QR" label centred in the QR box, until print runs print each page's code there. */
export function qrPlaceholderRun(qr: Rect): TextRun {
  const size = 9;
  const width = measure("QR", 600, size);
  return {
    x: roundPt(qr.x + (qr.w - width) / 2),
    baseline: roundPt(qr.y + (qr.h + CAP_HEIGHT * size) / 2),
    size,
    weight: 600,
    text: "QR",
    width: roundPt(width),
  };
}

/**
 * A printed page's code, centred under its QR code for matching a page by hand. Placed from the
 * QR box at print time, so layouts published before page codes printed need no change.
 */
export function pageCodeRun(qr: Rect, code: string): TextRun {
  const size = 6;
  const fitted = fitText(code, { size, weight: 400, maxWidth: qr.w }, 4);
  return {
    x: roundPt(qr.x + (qr.w - fitted.width) / 2),
    baseline: roundPt(qr.y + qr.h + 3 + CAP_HEIGHT * size),
    weight: 400,
    ...fitted,
  };
}

/** A single choice question whose options are all short numbers prints as a row of boxes. */
export function isRatingScale(item: Extract<SurveyItem, { kind: "single_choice" }>) {
  return (
    item.options.length >= 2 &&
    item.options.length <= 11 &&
    item.options.every((option) => /^-?\d{1,2}$/.test(plainText(option.label).trim()))
  );
}

/** A problem in words, the same in the builder and in the publish action's reply. */
export function describeProblem(problem: LayoutProblem, form: SurveyForm) {
  // By position as well as text, so two items that read the same are told apart.
  const name = (itemId: string) => {
    for (const page of form.pages) {
      const index = page.items.findIndex((item) => item.id === itemId);
      const item = page.items[index];
      if (item) {
        return itemName(item, index + 1);
      }
    }
    return "an item";
  };
  switch (problem.kind) {
    case "overflow": {
      const mm = Math.max(1, Math.ceil((problem.overBy * 25.4) / 72));
      const [first = "", ...rest] = problem.itemIds;
      const more =
        rest.length === 0 ? "" : ` and ${rest.length} more item${rest.length === 1 ? "" : "s"}`;
      return `Page ${problem.page} doesn't fit on A4: it runs ${mm} mm past the bottom. Move ${name(first)}${more} to another page.`;
    }
    case "too_wide":
      return `Page ${problem.page}: ${name(problem.itemId)} has too many or too long options to fit across the page. Use fewer or shorter options.`;
    case "unprintable":
      return `Page ${problem.page}: ${name(problem.itemId)} uses ${charName(problem.char)}, which the print font can't print. Remove it.`;
    case "unprintable_title":
      return `Page ${problem.page}'s title uses ${charName(problem.char)}, which the print font can't print. Remove it.`;
  }
}

/** A character in quotes, with its code point when it can't be seen (a combining mark, a control). */
function charName(char: string) {
  const codePoint = `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0")}`;
  return /^[\p{M}\p{C}\p{Z}]+$/u.test(char) ? `“${char}” (${codePoint})` : `“${char}”`;
}

function itemName(item: SurveyItem, position: number) {
  const text = isQuestion(item) ? item.prompt : item.kind === "divider" ? "" : item.text;
  // By character, not UTF-16 unit, so shortening never splits an emoji.
  const chars = Array.from(plainText(text).replaceAll(/\s+/g, " ").trim());
  if (chars.length === 0) {
    return `item ${position}`;
  }
  const shown = chars.length > 30 ? `${chars.slice(0, 29).join("").trimEnd()}…` : chars.join("");
  return `item ${position} (“${shown}”)`;
}

/** Every printed string of an item, raw. */
function itemText(item: SurveyItem): string[] {
  switch (item.kind) {
    case "heading":
    case "paragraph":
      return [item.text];
    case "divider":
      return [];
    case "single_choice":
    case "multiple_choice":
      return [item.prompt, item.helpText ?? "", ...item.options.map((o) => o.label)];
    case "grid":
      return [
        item.prompt,
        item.helpText ?? "",
        ...item.options.map((o) => o.label),
        ...item.rows.map((r) => r.label),
      ];
    case "number":
    case "date":
    case "text":
    case "signature":
      return [item.prompt, item.helpText ?? ""];
  }
}

/** Space above an item: a heading keeps closer to what follows it than to what came before. */
function gapBefore(item: SurveyItem, previous: SurveyItem | undefined) {
  if (!previous) {
    return 0;
  }
  if (previous.kind === "heading") {
    return 9;
  }
  if (item.kind === "heading") {
    return 27;
  }
  return item.kind === "divider" || previous.kind === "divider" ? 9 : 18;
}

/** "Page n of m" and the page title, with a rule under them, stopping short of the QR code. */
function pageHeading(number: number, pageCount: number, title: string | undefined): Drawable[] {
  const label = run(`Page ${number} of ${pageCount}`, STYLES.pageLabel, HEADER.left, INSET);
  const drawables: Drawable[] = [{ kind: "text", run: label }];
  const plainTitle = plainText(title ?? "").trim();
  if (plainTitle) {
    const style = STYLES.pageTitle;
    const x = roundPt(label.x + label.width + 12);
    const fitted = fitText(
      plainTitle,
      { size: style.size, weight: style.weight, maxWidth: HEADER.right - x },
      style.size,
    );
    drawables.push({
      kind: "text",
      run: { x, baseline: baselineIn(INSET, style), weight: style.weight, ...fitted },
    });
  }
  const ruleY = CONTENT.top - 10;
  drawables.push({
    kind: "line",
    x1: CONTENT.left,
    y1: ruleY,
    x2: HEADER.right,
    y2: ruleY,
    stroke: 0.5,
  });
  return drawables;
}

function headerSlot(slot: HeaderSlotId): HeaderSlot {
  const box = SLOT_BOXES[slot];
  return {
    slot,
    label: run(SLOT_LABELS[slot], STYLES.slotLabel, box.x, INSET + 22),
    value: {
      x: roundPt(box.x),
      baseline: baselineIn(INSET + 33, STYLES.slotValue),
      size: STYLES.slotValue.size,
      minSize: MIN_VALUE_SIZE,
      weight: STYLES.slotValue.weight,
      maxWidth: roundPt(box.width),
    },
  };
}

type Block = {
  content: Drawable[];
  fields: ResponseField[];
  bottom: number;
  tooWide?: boolean;
  standIn?: TextRun;
};

function layOutItem(item: SurveyItem, top: number): Block {
  if (!isQuestion(item)) {
    switch (item.kind) {
      case "heading":
      case "paragraph": {
        const text = textBlock(item.text, STYLES[item.kind], CONTENT.left, top, CONTENT_WIDTH, {
          align: item.align,
          standIn: item.kind === "heading" ? "Heading" : "Paragraph",
        });
        return { content: text.drawables, fields: [], bottom: text.bottom, standIn: text.standIn };
      }
      case "divider": {
        const y = roundPt(top + 4.5);
        return {
          content: [
            { kind: "line", x1: CONTENT.left, y1: y, x2: CONTENT.right, y2: y, stroke: 0.75 },
          ],
          fields: [],
          bottom: top + 9,
        };
      }
    }
  }

  const prompt = textBlock(item.prompt, STYLES.prompt, CONTENT.left, top, CONTENT_WIDTH, {
    standIn: "Question",
  });
  const helpTop = prompt.bottom + 2;
  const help = textBlock(responseHelp(item), STYLES.help, CONTENT.left, helpTop, CONTENT_WIDTH);
  const headerBottom = help.drawables.length > 0 ? help.bottom : prompt.bottom;
  const response = responseBlock(item, headerBottom + 6);
  return {
    ...response,
    content: [...prompt.drawables, ...help.drawables, ...response.content],
    standIn: prompt.standIn,
  };
}

/** A question's answer area, below its prompt and help, starting at `top`. */
function responseBlock(item: Extract<SurveyItem, { key: string }>, top: number): Block {
  const base = { field: item.key, questionId: item.id };
  switch (item.kind) {
    case "single_choice":
    case "multiple_choice": {
      const multiple = item.kind === "multiple_choice";
      const block =
        item.kind === "single_choice" && isRatingScale(item)
          ? ratingRow(item.options, top)
          : choiceFlow(item.options, top, multiple ? "square" : "circle");
      return {
        content: block.content,
        fields: [{ ...base, kind: "choice", multiple, mark: block.mark, marks: block.marks }],
        bottom: block.bottom,
      };
    }
    case "grid":
      return grid(item, top);
    case "number": {
      const digits = wholeCount(item.digits, 12);
      const cells = cellRow([{ count: digits }], top).groups.flat();
      return { content: [], fields: [{ ...base, kind: "digits", cells }], bottom: top + CELL.h };
    }
    case "date": {
      const groups = [
        { count: 2, hint: "DD" },
        { count: 2, hint: "MM" },
        { count: 4, hint: "YYYY" },
      ];
      const { groups: cells, hints } = cellRow(groups, top);
      return {
        content: hints,
        fields: [
          {
            ...base,
            kind: "date",
            day: cells[0] ?? [],
            month: cells[1] ?? [],
            year: cells[2] ?? [],
          },
        ],
        bottom: top + CELL.h + 2 + STYLES.hint.lineHeight,
      };
    }
    case "text": {
      const lines = wholeCount(item.lines, 30);
      const area = rect(CONTENT.left, top, CONTENT_WIDTH, lines * TEXT_LINE_GAP);
      return {
        content: [],
        fields: [{ ...base, kind: "text", area, lines }],
        bottom: area.y + area.h,
      };
    }
    case "signature": {
      const area = rect(CONTENT.left, top, CONTENT_WIDTH / 2, SIGNATURE_HEIGHT);
      return {
        content: [],
        fields: [{ ...base, kind: "signature", area }],
        bottom: area.y + area.h,
      };
    }
  }
}

/**
 * How many digits or lines to print. The builder lays out its unsaved form, where a cleared field
 * holds NaN; one NaN position would carry to every later item and hide the page's overflow.
 */
function wholeCount(count: number, max: number) {
  return Number.isInteger(count) ? Math.min(Math.max(count, 1), max) : 1;
}

/** The help text, and a number's range under it. A range end being typed (NaN) is left out. */
function responseHelp(item: Extract<SurveyItem, { key: string }>) {
  const help = item.helpText ?? "";
  if (item.kind !== "number") {
    return help;
  }
  const min = Number.isFinite(item.min) ? item.min : undefined;
  const max = Number.isFinite(item.max) ? item.max : undefined;
  if (min === undefined && max === undefined) {
    return help;
  }
  const range =
    min !== undefined && max !== undefined
      ? `${min}–${max}`
      : min !== undefined
        ? `${min} or more`
        : `Up to ${max}`;
  return help.trim() ? `${help}\n${range}` : range;
}

/** Options flowing left to right in rows, each a mark then its label. */
function choiceFlow(
  options: { code: string; label: string }[],
  top: number,
  mark: "circle" | "square",
) {
  const style = STYLES.option;
  const content: Drawable[] = [];
  const marks: ChoiceMark[] = [];
  const labelX = CHOICE.mark + CHOICE.labelGap;
  let x = CONTENT.left;
  let rowTop = top;
  let bottom = top;

  for (const option of options) {
    const lines = breakText(option.label, style, CONTENT_WIDTH - labelX);
    const width = labelX + (lines[0]?.width ?? 0);
    // A label that wraps takes a row of its own.
    const ownRow = lines.length > 1;
    if (x > CONTENT.left && (ownRow || x + width > CONTENT.right)) {
      x = CONTENT.left;
      rowTop = bottom + CHOICE.down;
    }
    marks.push({
      code: option.code,
      box: rect(x, rowTop + (style.lineHeight - CHOICE.mark) / 2, CHOICE.mark, CHOICE.mark),
    });
    content.push(...placeLines(lines, style, x + labelX, rowTop));
    bottom = Math.max(bottom, rowTop + Math.max(lines.length, 1) * style.lineHeight);
    x = ownRow ? CONTENT.right : x + width + CHOICE.across;
  }
  return { content, marks, mark, bottom };
}

/** Numbered options as a row of boxes, each under its number. */
function ratingRow(options: { code: string; label: string }[], top: number) {
  const style = STYLES.option;
  const content: Drawable[] = [];
  const marks: ChoiceMark[] = [];
  const boxTop = top + style.lineHeight + RATING.labelGap;
  let x = CONTENT.left;
  for (const option of options) {
    const [line] = breakText(option.label, style, CONTENT_WIDTH);
    const column = Math.max(RATING.box, line?.width ?? 0);
    if (line) {
      content.push(...placeLines([line], style, x + (column - line.width) / 2, top));
    }
    marks.push({
      code: option.code,
      box: rect(x + (column - RATING.box) / 2, boxTop, RATING.box, RATING.box),
    });
    x += column + RATING.across;
  }
  return { content, marks, mark: "square" as const, bottom: boxTop + RATING.box };
}

/** One shared scale across the top, one row of marks per statement. */
function grid(item: Extract<SurveyItem, { kind: "grid" }>, top: number): Block {
  const header = STYLES.gridHeader;
  const rowStyle = STYLES.option;
  // The narrowest column, in 2 pt steps, that sets every option header in at most three lines.
  const headersIn = (width: number) =>
    item.options.map((o) => breakText(o.label, header, width, "center"));
  let column: number = GRID.minColumn;
  while (
    column < GRID.maxColumn &&
    headersIn(column).some((lines) => lines.length > GRID.headerLines)
  ) {
    column += 2;
  }
  const headers = headersIn(column);
  const available = CONTENT_WIDTH - item.options.length * column;
  const tooWide =
    available < GRID.minLabel || headers.some((lines) => lines.length > GRID.headerLines);
  const labelWidth = Math.max(available, GRID.minLabel);
  const columnX = (i: number) => CONTENT.left + labelWidth + i * column;

  const headerHeight = Math.max(0, ...headers.map((lines) => lines.length)) * header.lineHeight;
  const content: Drawable[] = headers.flatMap((lines, i) =>
    // Headers sit on the rows, so a short one lines up with the bottom of the tallest.
    placeLines(lines, header, columnX(i), top + headerHeight - lines.length * header.lineHeight),
  );

  const fields: ResponseField[] = [];
  const right = columnX(item.options.length);
  let rowTop = top + headerHeight + 4;
  for (const row of item.rows) {
    const lines = breakText(row.label, rowStyle, labelWidth - 8);
    const height = Math.max(lines.length * rowStyle.lineHeight, RATING.box) + GRID.rowPadding;
    content.push({
      kind: "line",
      x1: CONTENT.left,
      y1: roundPt(rowTop),
      x2: roundPt(right),
      y2: roundPt(rowTop),
      stroke: 0.5,
    });
    const textTop = rowTop + (height - Math.max(lines.length, 1) * rowStyle.lineHeight) / 2;
    content.push(...placeLines(lines, rowStyle, CONTENT.left, textTop));
    const markTop = rowTop + (height - CHOICE.mark) / 2;
    fields.push({
      field: `${item.key}.${row.key}`,
      questionId: item.id,
      kind: "choice",
      multiple: false,
      mark: "circle",
      marks: item.options.map((o, i) => ({
        code: o.code,
        box: rect(columnX(i) + (column - CHOICE.mark) / 2, markTop, CHOICE.mark, CHOICE.mark),
      })),
    });
    rowTop += height;
  }
  if (item.rows.length > 0) {
    content.push({
      kind: "line",
      x1: CONTENT.left,
      y1: roundPt(rowTop),
      x2: roundPt(right),
      y2: roundPt(rowTop),
      stroke: 0.5,
    });
  }
  return { content, fields, bottom: rowTop, tooWide };
}

/** Groups of digit cells side by side, in reading order, each with its hint centred under it. */
function cellRow(groups: { count: number; hint?: string }[], top: number) {
  const cells: Rect[][] = [];
  const hints: Drawable[] = [];
  let x = CONTENT.left;
  for (const { count, hint } of groups) {
    const width = count * CELL.w + (count - 1) * CELL.gap;
    cells.push(
      Array.from({ length: count }, (_, i) =>
        rect(x + i * (CELL.w + CELL.gap), top, CELL.w, CELL.h),
      ),
    );
    if (hint) {
      const hintWidth = measure(hint, STYLES.hint.weight, STYLES.hint.size);
      hints.push({
        kind: "text",
        run: run(hint, STYLES.hint, x + (width - hintWidth) / 2, top + CELL.h + 2),
      });
    }
    x += width + CELL.groupGap;
  }
  return { groups: cells, hints };
}

/**
 * Text broken into lines from `top`. With a `standIn`, blank text keeps one line and returns the
 * stand-in to show there, so a new heading or question has a place on the sheet.
 */
function textBlock(
  raw: string,
  style: Style,
  x: number,
  top: number,
  width: number,
  { align, standIn }: { align?: "center"; standIn?: string } = {},
) {
  if (standIn && isBlank(raw)) {
    const standInWidth = measure(standIn, style.weight, style.size);
    const standInX = align === "center" ? x + (width - standInWidth) / 2 : x;
    return {
      drawables: [],
      bottom: top + style.lineHeight,
      standIn: run(standIn, style, standInX, top),
    };
  }
  const lines = breakText(raw, style, width, align);
  return {
    drawables: placeLines(lines, style, x, top),
    bottom: top + lines.length * style.lineHeight,
    standIn: undefined,
  };
}

/** Text drawables for broken lines whose first line box starts at `top`. */
function placeLines(lines: ReturnType<typeof breakText>, style: Style, x: number, top: number) {
  return lines.flatMap((line, i) =>
    line.runs.map((placed): Drawable => ({
      kind: "text",
      run: {
        x: roundPt(x + placed.dx),
        baseline: baselineIn(top + i * style.lineHeight, style),
        size: style.size,
        weight: placed.weight,
        text: placed.text,
        width: placed.width,
      },
    })),
  );
}

/** The baseline that centres a capital letter in a line box. */
function baselineIn(lineTop: number, style: Style) {
  return roundPt(lineTop + (style.lineHeight + CAP_HEIGHT * style.size) / 2);
}

function run(text: string, style: Style, x: number, lineTop: number): TextRun {
  const weight = style.weight;
  return {
    x: roundPt(x),
    baseline: baselineIn(lineTop, style),
    size: style.size,
    weight,
    text,
    width: roundPt(measure(text, weight, style.size)),
  };
}

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x: roundPt(x), y: roundPt(y), w: roundPt(w), h: roundPt(h) };
}
