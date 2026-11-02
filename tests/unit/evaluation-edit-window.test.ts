import { describe, expect, it } from "vitest";

import {
  evaluationEditDeadline,
  mayEditEvaluation,
  requireEvaluationEditable,
} from "#/lib/evaluation-edit-window";

const createdAt = new Date("2026-03-20T09:30:00.000Z");
const deadline = new Date("2026-04-03T09:30:00.000Z");

describe("evaluationEditDeadline", () => {
  it("falls 14 days of 24 hours after the evaluation was saved", () => {
    expect(evaluationEditDeadline(createdAt)).toEqual(deadline);
  });
});

describe("mayEditEvaluation", () => {
  it("allows edits until the deadline and not from it on", () => {
    expect(mayEditEvaluation(createdAt, createdAt)).toBe(true);
    expect(mayEditEvaluation(createdAt, new Date(deadline.getTime() - 1))).toBe(true);
    expect(mayEditEvaluation(createdAt, deadline)).toBe(false);
    expect(mayEditEvaluation(createdAt, new Date("2026-05-01T00:00:00.000Z"))).toBe(false);
  });
});

describe("requireEvaluationEditable", () => {
  it("lets a new evaluation and one inside its window through", () => {
    expect(() => requireEvaluationEditable(undefined, deadline)).not.toThrow();
    expect(() =>
      requireEvaluationEditable({ createdAt }, new Date(deadline.getTime() - 1)),
    ).not.toThrow();
  });

  it("refuses a saved evaluation past its deadline", () => {
    expect(() => requireEvaluationEditable({ createdAt }, deadline)).toThrow(
      /can no longer be edited/,
    );
  });
});
