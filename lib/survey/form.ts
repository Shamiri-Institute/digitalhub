// A survey version's form: one document holding every printed page and item in order. It is
// stored whole in survey_versions.form, and freezes when the version is published, so printed
// copies and their answers can rely on it never changing.

/** The whole form. `format` lets readers recognise older documents if the shape ever changes. */
export type SurveyForm = { format: 1; pages: SurveyPage[] };

/** One printed page; its page number is its position in `pages`, starting at 1. */
export type SurveyPage = { title?: string; items: SurveyItem[] };

export type SurveyItem = DisplayItem | QuestionItem;

type ItemBase = {
  /** Stable within the form and kept when a draft is copied; not an export name. */
  id: string;
};

/** Printed only, never answered, so it has no key. */
export type DisplayItem = ItemBase &
  ({ kind: "heading"; text: string } | { kind: "paragraph"; text: string } | { kind: "divider" });

/** One answer choice. `code` is what an answer stores and exports; labels may change. */
export type ChoiceOption = { code: string; label: string };

type QuestionBase = ItemBase & {
  /**
   * The export column name, unique in the form and kept across versions so answers line up.
   * Lowercase letters, digits and underscores, so a grid row's field `${key}.${row.key}` is
   * never ambiguous.
   */
  key: string;
  prompt: string;
  helpText?: string;
  required: boolean;
  /** Overrides how this question's scanned answers are reviewed. */
  review?: { confidenceThreshold?: number; verifyAlways?: boolean };
};

/** Every item with a key is answered; nothing else is. */
export type QuestionItem = QuestionBase &
  (
    | { kind: "single_choice"; options: ChoiceOption[] }
    | { kind: "multiple_choice"; options: ChoiceOption[] }
    /** One shared scale; each row is answered on its own, as field `${key}.${row.key}`. */
    | { kind: "grid"; options: ChoiceOption[]; rows: { key: string; label: string }[] }
    | { kind: "number"; digits: number; min?: number; max?: number }
    | { kind: "date" }
    | { kind: "text"; lines: number }
    | { kind: "signature" }
  );

export const EMPTY_FORM: SurveyForm = { format: 1, pages: [] };

/** The pages and answerable questions of a form, as the versions table shows them. */
export function summarizeForm(form: SurveyForm) {
  const questionCount = form.pages
    .flatMap((page) => page.items)
    .filter((item) => "key" in item).length;
  return { pageCount: form.pages.length, questionCount };
}
