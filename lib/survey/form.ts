// A survey version's form: one document holding every printed page and item in order. It is
// stored whole in survey_versions.form, and freezes when the version is published, so printed
// copies and their answers can rely on it never changing. The schema below is its only
// definition; the types are inferred from it.

import { z } from "zod";

/** A question's export column name: lowercase letters, digits and `_`, starting with a letter. */
export const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
export const KEY_MAX_LENGTH = 64;

const Key = z
  .string()
  .max(KEY_MAX_LENGTH, { error: `Use at most ${KEY_MAX_LENGTH} characters` })
  .regex(KEY_PATTERN, {
    error: "Use lowercase letters, digits and _, starting with a letter",
  });

/**
 * A grid row's key, so its field `${key}.${row.key}` never holds a second dot. Rows are often
 * numbered (`phq.1`), so a row key may start with a digit.
 */
const RowKey = z
  .string()
  .max(KEY_MAX_LENGTH, { error: `Use at most ${KEY_MAX_LENGTH} characters` })
  .regex(/^[a-z0-9_]+$/, { error: "Use lowercase letters, digits and _" });

/** One answer choice. `code` is what an answer stores and exports; labels may change. */
const ChoiceOptionSchema = z.object({
  code: z
    .string()
    .max(32, { error: "Use at most 32 characters" })
    .regex(/^[A-Za-z0-9_]+$/, { error: "Use letters, digits and _" }),
  label: z.string(),
});

/** Stable within the form and kept when a draft is copied; not an export name. */
const ItemId = z.string().min(1);

const QuestionBase = {
  id: ItemId,
  /** The export column name, unique in the form and kept across versions so answers line up. */
  key: Key,
  prompt: z.string(),
  helpText: z.string().optional(),
  required: z.boolean(),
  /** Overrides how this question's scanned answers are reviewed. */
  review: z
    .object({
      confidenceThreshold: z
        .number()
        .min(0, { error: "Use a number from 0 to 1" })
        .max(1, { error: "Use a number from 0 to 1" })
        .optional(),
      verifyAlways: z.boolean().optional(),
    })
    .optional(),
};

const SurveyItemSchema = z.discriminatedUnion("kind", [
  // Printed only, never answered, so they have no key.
  z.object({ id: ItemId, kind: z.literal("heading"), text: z.string() }),
  z.object({ id: ItemId, kind: z.literal("paragraph"), text: z.string() }),
  z.object({ id: ItemId, kind: z.literal("divider") }),
  // Every item with a key is answered; nothing else is.
  z.object({
    ...QuestionBase,
    kind: z.literal("single_choice"),
    options: z.array(ChoiceOptionSchema),
  }),
  z.object({
    ...QuestionBase,
    kind: z.literal("multiple_choice"),
    options: z.array(ChoiceOptionSchema),
  }),
  // One shared scale; each row is answered on its own, as field `${key}.${row.key}`.
  z.object({
    ...QuestionBase,
    kind: z.literal("grid"),
    options: z.array(ChoiceOptionSchema),
    rows: z.array(z.object({ key: RowKey, label: z.string() })),
  }),
  z.object({
    ...QuestionBase,
    kind: z.literal("number"),
    digits: z
      .int({ error: "Use a whole number of digits" })
      .min(1, { error: "Use 1 to 12 digits" })
      .max(12, { error: "Use 1 to 12 digits" }),
    min: z.number().optional(),
    max: z.number().optional(),
  }),
  z.object({ ...QuestionBase, kind: z.literal("date") }),
  z.object({
    ...QuestionBase,
    kind: z.literal("text"),
    lines: z
      .int({ error: "Use a whole number of lines" })
      .min(1, { error: "Use 1 to 30 lines" })
      .max(30, { error: "Use 1 to 30 lines" }),
  }),
  z.object({ ...QuestionBase, kind: z.literal("signature") }),
]);

/** One printed page; its page number is its position in `pages`, starting at 1. */
const SurveyPageSchema = z.object({
  title: z.string().optional(),
  items: z.array(SurveyItemSchema),
});

/** The whole form. `format` lets readers recognise older documents if the shape ever changes. */
export const SurveyFormSchema = z.object({
  format: z.literal(1),
  pages: z.array(SurveyPageSchema),
});

export type SurveyForm = z.infer<typeof SurveyFormSchema>;
export type SurveyPage = SurveyForm["pages"][number];
export type SurveyItem = SurveyPage["items"][number];
export type ItemKind = SurveyItem["kind"];
export type QuestionItem = Extract<SurveyItem, { key: string }>;
export type QuestionKind = QuestionItem["kind"];
export type DisplayItem = Exclude<SurveyItem, QuestionItem>;
export type ChoiceOption = z.infer<typeof ChoiceOptionSchema>;

/** What the builder calls each kind of item. */
export const ITEM_KIND_LABELS: Record<ItemKind, string> = {
  heading: "Heading",
  paragraph: "Paragraph",
  divider: "Divider",
  single_choice: "Single choice",
  multiple_choice: "Multiple choice",
  grid: "Grid",
  number: "Number",
  date: "Date",
  text: "Text",
  signature: "Signature",
};

export function isQuestion(item: SurveyItem): item is QuestionItem {
  return "key" in item;
}

export const EMPTY_FORM: SurveyForm = { format: 1, pages: [] };

/** The pages and answerable questions of a form, as the versions table shows them. */
export function summarizeForm(form: SurveyForm) {
  const questionCount = form.pages.flatMap((page) => page.items).filter(isQuestion).length;
  return { pageCount: form.pages.length, questionCount };
}
