// What a reviewer needs to know about one answer field: the question as printed, the input its
// value takes, and where on the page to cut it from. Fields are a question's key, or `key.row` for
// a grid row, as answers store them.

import {
  SurveyAnswerReadStatus,
  SurveyAnswerReviewStatus,
  SurveyQuestionnaireStatus,
} from "#/db/enums";
import {
  type ChoiceOption,
  gridRowField,
  isQuestion,
  type QuestionItem,
  type SurveyForm,
} from "#/lib/survey/form";
import type { Layout, LayoutPage, Rect, ResponseField } from "#/lib/survey/layout";
import { plainText } from "#/lib/survey/rich-text";

/** What an answer stores: a code, codes, digits, a date, text, or a signature. Null is blank. */
export type AnswerValue = string | string[] | true;

/** A reviewer's value as it will be stored: text trimmed, codes once each and sorted, blank null. */
export function normalisedAnswer(value: AnswerValue | null): AnswerValue | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? null : [...new Set(value)].toSorted();
  }
  return value;
}

/**
 * Whether `draft` says something other than `stored`, both tidied: trimming the pipeline's text or
 * reordering ticked codes is not a correction. The page and the server both decide by this.
 */
export function changesAnswer(draft: AnswerValue | null, stored: AnswerValue | null) {
  return JSON.stringify(normalisedAnswer(draft)) !== JSON.stringify(normalisedAnswer(stored));
}

/** Verified or corrected by someone; an answer accepted automatically was never seen by a person. */
export function reviewedByAPerson(reviewStatus: SurveyAnswerReviewStatus) {
  return (
    reviewStatus === SurveyAnswerReviewStatus.VERIFIED ||
    reviewStatus === SurveyAnswerReviewStatus.CORRECTED
  );
}

/** Copies whose answers no longer change. */
export const SETTLED_COPY_STATUSES: readonly SurveyQuestionnaireStatus[] = [
  SurveyQuestionnaireStatus.VOID,
  SurveyQuestionnaireStatus.VERIFIED,
];

export function isSettledCopy(status: SurveyQuestionnaireStatus) {
  return SETTLED_COPY_STATUSES.includes(status);
}

/** What the pipeline read, in words: nothing definite when it found marks it couldn't settle. */
export function pipelineReadText(
  input: FieldInput | undefined,
  recognizedValue: AnswerValue | null,
  readStatus: SurveyAnswerReadStatus | null,
) {
  if (recognizedValue === null && readStatus !== SurveyAnswerReadStatus.BLANK) {
    return "nothing definite";
  }
  return input ? formatAnswer(input, recognizedValue) : JSON.stringify(recognizedValue);
}

/** An answer as a reviewer reads it: option labels rather than codes, and "Blank" for none. */
export function formatAnswer(input: FieldInput, value: AnswerValue | null | undefined): string {
  if (value === null || value === undefined) {
    return "Blank";
  }
  switch (input.kind) {
    case "choice": {
      const codes = Array.isArray(value) ? value : [String(value)];
      return codes
        .map((code) => {
          const label = input.options.find((option) => option.code === code)?.label;
          return label && label !== code ? `${label} (${code})` : code;
        })
        .join(", ");
    }
    case "signature":
      return value === true ? "Signed" : String(value);
    default:
      return Array.isArray(value) ? value.join(", ") : String(value);
  }
}

export type FieldInput =
  | { kind: "choice"; multiple: boolean; options: ChoiceOption[] }
  | { kind: "digits"; digits: number; min?: number; max?: number }
  | { kind: "date" }
  | { kind: "text"; lines: number }
  | { kind: "signature" };

export type FieldQuestion = {
  field: string;
  prompt: string;
  /** A grid row's label; the prompt is the grid's. */
  rowLabel?: string;
  required: boolean;
  input: FieldInput;
};

/** Every answer field of a form with its question, built in one pass. */
export function fieldQuestionsOf(form: SurveyForm): ReadonlyMap<string, FieldQuestion> {
  const questions = new Map<string, FieldQuestion>();
  for (const question of form.pages.flatMap((page) => page.items).filter(isQuestion)) {
    for (const described of questionFields(question)) {
      questions.set(described.field, described);
    }
  }
  return questions;
}

export function fieldQuestionOf(form: SurveyForm, field: string): FieldQuestion | undefined {
  return fieldQuestionsOf(form).get(field);
}

function questionFields(question: QuestionItem): FieldQuestion[] {
  const base = { prompt: plainText(question.prompt), required: question.required };
  switch (question.kind) {
    case "grid": {
      const options = question.options.map(plainOption);
      return question.rows.map((row) => ({
        ...base,
        field: gridRowField(question.key, row.key),
        rowLabel: plainText(row.label),
        input: { kind: "choice", multiple: false, options },
      }));
    }
    case "single_choice":
    case "multiple_choice":
      return [
        {
          ...base,
          field: question.key,
          input: {
            kind: "choice",
            multiple: question.kind === "multiple_choice",
            options: question.options.map(plainOption),
          },
        },
      ];
    case "number":
      return [
        {
          ...base,
          field: question.key,
          input: { kind: "digits", digits: question.digits, min: question.min, max: question.max },
        },
      ];
    case "text":
      return [{ ...base, field: question.key, input: { kind: "text", lines: question.lines } }];
    case "date":
    case "signature":
      return [{ ...base, field: question.key, input: { kind: question.kind } }];
  }
}

function plainOption(option: ChoiceOption): ChoiceOption {
  return { code: option.code, label: plainText(option.label) };
}

/** Points of page kept around a field's cut-out, so a mark just outside its box still shows. */
const CROP_MARGIN_PT = 8;
/** A grid row also shows the rows around it: a row alone is too thin to read at panel width. */
const GRID_ROW_CONTEXT_PT = 24;

export type FieldCrop = {
  /** The part of the page to show, in layout points. */
  view: Rect;
  /** The field itself within it, to outline. */
  focus: Rect;
};

/**
 * Where on the page to cut a field from. A whole question shows with its prompt and options; a
 * grid row shows across the grid's width, so its label and marks sit side by side, with the
 * neighbouring rows above and below.
 */
export function fieldCropOf(
  page: LayoutPage,
  paper: Layout["paper"],
  field: string,
): FieldCrop | undefined {
  const responseField = page.fields.find((candidate) => candidate.field === field);
  if (!responseField) {
    return undefined;
  }
  const marks = boundsOf(boxesOf(responseField));
  const question = page.items.find((item) => item.itemId === responseField.questionId)?.box;
  const isGridRow = field.includes(".");
  const focus =
    question === undefined ? marks : isGridRow ? { ...marks, x: question.x, w: question.w } : marks;
  const area =
    question === undefined
      ? marks
      : isGridRow
        ? {
            x: question.x,
            y: marks.y - GRID_ROW_CONTEXT_PT,
            w: question.w,
            h: marks.h + 2 * GRID_ROW_CONTEXT_PT,
          }
        : boundsOf([question, marks]);
  const x = Math.max(area.x - CROP_MARGIN_PT, 0);
  const y = Math.max(area.y - CROP_MARGIN_PT, 0);
  return {
    view: {
      x,
      y,
      w: Math.min(area.w + 2 * CROP_MARGIN_PT, paper.width - x),
      h: Math.min(area.h + 2 * CROP_MARGIN_PT, paper.height - y),
    },
    focus,
  };
}

function boxesOf(field: ResponseField): Rect[] {
  switch (field.kind) {
    case "choice":
      return field.marks.map((mark) => mark.box);
    case "digits":
      return field.cells;
    case "date":
      return [...field.day, ...field.month, ...field.year];
    case "text":
    case "signature":
      return [field.area];
  }
}

function boundsOf(boxes: Rect[]): Rect {
  const left = Math.min(...boxes.map((box) => box.x));
  const top = Math.min(...boxes.map((box) => box.y));
  const right = Math.max(...boxes.map((box) => box.x + box.w));
  const bottom = Math.max(...boxes.map((box) => box.y + box.h));
  return { x: left, y: top, w: right - left, h: bottom - top };
}
