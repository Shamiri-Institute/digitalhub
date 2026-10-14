// @vitest-environment node
import { describe, expect, it } from "vitest";

import { SurveyQuestionType } from "#/db/enums";
import {
  answerSchemaFor,
  type QuestionDefinition,
  questionDefinitionSchema,
  questionTypes,
} from "#/lib/survey/question-types";

const choices = {
  options: [
    { code: "A", label: "Yes" },
    { code: "B", label: "No" },
    { code: "C", label: "Not sure" },
  ],
};

function accepts(question: QuestionDefinition, answer: unknown, required = true) {
  return answerSchemaFor({ ...question, required }).safeParse(answer).success;
}

describe("survey question types", () => {
  it("has a default config that its own schema accepts, for every type", () => {
    for (const type of Object.values(SurveyQuestionType)) {
      const { configSchema, defaultConfig } = questionTypes[type];
      expect(configSchema.safeParse(defaultConfig).success, type).toBe(true);
    }
  });

  it("has a definition branch for every type", () => {
    for (const type of Object.values(SurveyQuestionType)) {
      const config = questionTypes[type].defaultConfig;
      expect(questionDefinitionSchema.safeParse({ type, config }).success, type).toBe(true);
    }
  });

  it("rejects configs that no answer could satisfy", () => {
    const { MULTIPLE_CHOICE, NUMBER } = questionTypes;
    expect(NUMBER.configSchema.safeParse({ digits: 2, min: 100, max: null }).success).toBe(false);
    expect(
      MULTIPLE_CHOICE.configSchema.safeParse({ ...choices, minSelections: 4, maxSelections: null })
        .success,
    ).toBe(false);
    expect(
      MULTIPLE_CHOICE.configSchema.safeParse({ ...choices, minSelections: 0, maxSelections: null })
        .success,
    ).toBe(false);
  });

  it("rejects a definition whose config does not match its type", () => {
    expect(questionDefinitionSchema.safeParse({ type: "RATING", config: choices }).success).toBe(
      false,
    );
    expect(
      questionDefinitionSchema.safeParse({ type: "SINGLE_CHOICE", config: choices }).success,
    ).toBe(true);
  });

  it("rejects invalid configs", () => {
    const { SINGLE_CHOICE, MULTIPLE_CHOICE, RATING, NUMBER, DATE } = questionTypes;
    expect(SINGLE_CHOICE.configSchema.safeParse({ options: [choices.options[0]] }).success).toBe(
      false,
    );
    expect(
      SINGLE_CHOICE.configSchema.safeParse({
        options: [
          { code: "A", label: "Yes" },
          { code: "A", label: "No" },
        ],
      }).success,
    ).toBe(false);
    expect(
      MULTIPLE_CHOICE.configSchema.safeParse({ ...choices, minSelections: 2, maxSelections: 4 })
        .success,
    ).toBe(false);
    expect(
      RATING.configSchema.safeParse({ min: 5, max: 1, minLabel: null, maxLabel: null }).success,
    ).toBe(false);
    expect(NUMBER.configSchema.safeParse({ digits: 2, min: null, max: 150 }).success).toBe(false);
    expect(DATE.configSchema.safeParse({ min: "2026-02-01", max: "2026-01-01" }).success).toBe(
      false,
    );
  });

  it("checks single and multiple choice answers against the option codes", () => {
    const single: QuestionDefinition = { type: "SINGLE_CHOICE", config: choices };
    expect(accepts(single, "B")).toBe(true);
    expect(accepts(single, "Z")).toBe(false);

    const multiple: QuestionDefinition = {
      type: "MULTIPLE_CHOICE",
      config: { ...choices, minSelections: null, maxSelections: 2 },
    };
    expect(accepts(multiple, ["A", "C"])).toBe(true);
    expect(accepts(multiple, ["A", "B", "C"])).toBe(false);
    expect(accepts(multiple, ["A", "A"])).toBe(false);
    expect(accepts(multiple, [])).toBe(false);
  });

  it("checks rating, number and date answers against their bounds", () => {
    const rating: QuestionDefinition = {
      type: "RATING",
      config: { min: 1, max: 5, minLabel: null, maxLabel: null },
    };
    expect(accepts(rating, 5)).toBe(true);
    expect(accepts(rating, 6)).toBe(false);
    expect(accepts(rating, 2.5)).toBe(false);

    const number: QuestionDefinition = {
      type: "NUMBER",
      config: { digits: 2, min: 10, max: null },
    };
    expect(accepts(number, 99)).toBe(true);
    expect(accepts(number, 100)).toBe(false);
    expect(accepts(number, 9)).toBe(false);

    const date: QuestionDefinition = { type: "DATE", config: { min: "2000-01-01", max: null } };
    expect(accepts(date, "2010-06-15")).toBe(true);
    expect(accepts(date, "1999-12-31")).toBe(false);
    expect(accepts(date, "15/06/2010")).toBe(false);
  });

  it("checks text length and lets an optional question be left blank", () => {
    const short: QuestionDefinition = { type: "SHORT_TEXT", config: { maxLength: 5 } };
    expect(accepts(short, "Nairo")).toBe(true);
    expect(accepts(short, "Nairobi")).toBe(false);
    expect(accepts(short, null)).toBe(false);
    expect(accepts(short, null, false)).toBe(true);
  });
});
