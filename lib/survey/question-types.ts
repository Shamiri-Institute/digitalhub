// The one place that knows each survey question type: its label, the shape and rules of its
// config, the config a new question starts with, and which answers it accepts. The builder, the
// server actions and answer validation all read from here. Adding a type takes three edits in this
// file: its config schema in configSchemas, its entry in questionTypes, and its branch in
// questionDefinitionSchema. TypeScript flags a missing entry in the first two, and
// survey-question-types.test.ts fails on a missing branch in the third.
// Plain Zod and no server imports, so client components can use it too.
import { z } from "zod";

import { SurveyQuestionType } from "#/db/enums";

const choiceOptionSchema = z.object({
  // Codes are what is stored and exported, so relabelling an option keeps the data comparable.
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{1,32}$/, { error: "Use up to 32 letters, digits or underscores" }),
  label: z
    .string()
    .trim()
    .min(1, { error: "Every option needs a label" })
    .max(200, { error: "Keep labels under 200 characters" }),
});

const choiceOptionsSchema = z
  .array(choiceOptionSchema)
  .min(2, { error: "Add at least two options" })
  .max(20, { error: "Use at most 20 options" })
  .refine((options) => new Set(options.map((o) => o.code)).size === options.length, {
    error: "Option codes must be unique",
  });

function isOrdered(min: number | string | null, max: number | string | null) {
  return min === null || max === null || min <= max;
}

const configSchemas = {
  SINGLE_CHOICE: z.object({ options: choiceOptionsSchema }),
  MULTIPLE_CHOICE: z
    .object({
      options: choiceOptionsSchema,
      // At least one: "nothing picked" is a blank answer (null), never an empty list.
      minSelections: z.int().min(1).nullable(),
      maxSelections: z.int().min(1).nullable(),
    })
    .refine((c) => isOrdered(c.minSelections, c.maxSelections), {
      error: "The minimum cannot be above the maximum",
    })
    .refine((c) => Math.max(c.minSelections ?? 0, c.maxSelections ?? 0) <= c.options.length, {
      error: "Selections cannot exceed the number of options",
    }),
  RATING: z
    .object({
      min: z.int().min(0).max(10),
      max: z.int().min(1).max(10),
      minLabel: z.string().trim().max(50).nullable(),
      maxLabel: z.string().trim().max(50).nullable(),
    })
    .refine((c) => c.min < c.max, { error: "The scale must start below where it ends" }),
  // Written into digit boxes on paper, so whole numbers from zero up, at most `digits` long.
  NUMBER: z
    .object({
      digits: z.int().min(1).max(9),
      min: z.int().min(0).nullable(),
      max: z.int().min(0).nullable(),
    })
    .refine((c) => isOrdered(c.min, c.max), { error: "The minimum cannot be above the maximum" })
    .refine((c) => c.max === null || String(c.max).length <= c.digits, {
      error: "The maximum has more digits than the boxes allow",
    })
    .refine((c) => c.min === null || String(c.min).length <= c.digits, {
      error: "The minimum has more digits than the boxes allow",
    }),
  DATE: z
    .object({ min: z.iso.date().nullable(), max: z.iso.date().nullable() })
    .refine((c) => isOrdered(c.min, c.max), { error: "The earliest date is after the latest" }),
  SHORT_TEXT: z.object({ maxLength: z.int().min(1).max(200) }),
  LONG_TEXT: z.object({ lines: z.int().min(2).max(20) }),
} satisfies Record<SurveyQuestionType, z.ZodType>;

export type QuestionConfigs = {
  [T in SurveyQuestionType]: z.infer<(typeof configSchemas)[T]>;
};
export type QuestionConfig = QuestionConfigs[SurveyQuestionType];

type QuestionTypeEntry<T extends SurveyQuestionType> = {
  label: string;
  configSchema: (typeof configSchemas)[T];
  defaultConfig: QuestionConfigs[T];
  /** The answers this config accepts, before the question's `required` flag is applied. */
  answerSchema: (config: QuestionConfigs[T]) => z.ZodType;
};

function codeOf(options: { code: string }[]) {
  const codes = new Set(options.map((o) => o.code));
  return z.string().refine((code) => codes.has(code), { error: "Pick one of the options" });
}

export const questionTypes: { [T in SurveyQuestionType]: QuestionTypeEntry<T> } = {
  SINGLE_CHOICE: {
    label: "Single choice",
    configSchema: configSchemas.SINGLE_CHOICE,
    defaultConfig: {
      options: [
        { code: "1", label: "Option 1" },
        { code: "2", label: "Option 2" },
      ],
    },
    answerSchema: (config) => codeOf(config.options),
  },
  MULTIPLE_CHOICE: {
    label: "Multiple choice",
    configSchema: configSchemas.MULTIPLE_CHOICE,
    defaultConfig: {
      options: [
        { code: "1", label: "Option 1" },
        { code: "2", label: "Option 2" },
      ],
      minSelections: null,
      maxSelections: null,
    },
    answerSchema: (config) =>
      z
        .array(codeOf(config.options))
        .min(config.minSelections ?? 1, { error: "Too few options picked" })
        .max(config.maxSelections ?? config.options.length, { error: "Too many options picked" })
        .refine((codes) => new Set(codes).size === codes.length, {
          error: "An option is picked twice",
        }),
  },
  RATING: {
    label: "Rating scale",
    configSchema: configSchemas.RATING,
    defaultConfig: { min: 1, max: 5, minLabel: null, maxLabel: null },
    answerSchema: (config) => z.int().min(config.min).max(config.max),
  },
  NUMBER: {
    label: "Number",
    configSchema: configSchemas.NUMBER,
    defaultConfig: { digits: 2, min: null, max: null },
    answerSchema: (config) =>
      z
        .int()
        .min(config.min ?? 0)
        .max(config.max ?? 10 ** config.digits - 1),
  },
  DATE: {
    label: "Date",
    configSchema: configSchemas.DATE,
    defaultConfig: { min: null, max: null },
    // ISO dates compare correctly as strings.
    answerSchema: (config) =>
      z.iso.date().refine((date) => isOrdered(config.min, date) && isOrdered(date, config.max), {
        error: "The date is outside the allowed range",
      }),
  },
  SHORT_TEXT: {
    label: "Short text",
    configSchema: configSchemas.SHORT_TEXT,
    defaultConfig: { maxLength: 50 },
    answerSchema: (config) => z.string().trim().min(1).max(config.maxLength),
  },
  LONG_TEXT: {
    label: "Long text",
    configSchema: configSchemas.LONG_TEXT,
    defaultConfig: { lines: 4 },
    answerSchema: () => z.string().trim().min(1).max(5000),
  },
};

/** A question's type with the config that type requires. */
export const questionDefinitionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(SurveyQuestionType.SINGLE_CHOICE),
    config: configSchemas.SINGLE_CHOICE,
  }),
  z.object({
    type: z.literal(SurveyQuestionType.MULTIPLE_CHOICE),
    config: configSchemas.MULTIPLE_CHOICE,
  }),
  z.object({ type: z.literal(SurveyQuestionType.RATING), config: configSchemas.RATING }),
  z.object({ type: z.literal(SurveyQuestionType.NUMBER), config: configSchemas.NUMBER }),
  z.object({ type: z.literal(SurveyQuestionType.DATE), config: configSchemas.DATE }),
  z.object({ type: z.literal(SurveyQuestionType.SHORT_TEXT), config: configSchemas.SHORT_TEXT }),
  z.object({ type: z.literal(SurveyQuestionType.LONG_TEXT), config: configSchemas.LONG_TEXT }),
]);
export type QuestionDefinition = z.infer<typeof questionDefinitionSchema>;

/** The answers a question accepts; `null` stands for "not answered". */
export function answerSchemaFor(question: QuestionDefinition & { required: boolean }) {
  // TypeScript cannot correlate `type` and `config` across the union, so look the entry up loosely;
  // questionDefinitionSchema guarantees they match.
  const entry = questionTypes[question.type] as QuestionTypeEntry<SurveyQuestionType>;
  const value = entry.answerSchema(question.config);
  return question.required ? value : value.nullable();
}
