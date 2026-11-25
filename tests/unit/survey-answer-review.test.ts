// @vitest-environment node
// Reviewing flagged answers, on answers made the way scans make them: a published survey, an
// issued copy, and scanned pages ingested with unsure reads. The copy's status and who reviewed an
// answer show on no page yet, so those are read from the database.
import { and, asc, eq, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { db } from "#/db/client";
import { hub, project, surveyAnswer, surveyQuestionnaire, surveyVersion } from "#/db/schema";
import { SurveyError } from "#/lib/actions/survey/respond";
import type { AdminScope } from "#/lib/auth/admin-access";
import { fieldCropOf, fieldQuestionOf } from "#/lib/survey/answer-fields";
import { fetchAnswerForReview, fetchReviewQueue, reviewAnswer } from "#/lib/survey/answer-review";
import {
  createPrintSchool,
  createPublishedSurvey,
  createScannedCopy,
  removeSurvey,
} from "#/tests/survey-fixtures";
import { PRINT_FORM } from "./fixtures/survey-print-form";

let scope: AdminScope & { hubId: string };
let schoolId: string;
let removeSchool: (() => Promise<void>) | undefined;
let versionId: string;
let surveyId: string;
const surveyCode = `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

beforeAll(async () => {
  const [defaultHub] = await db
    .select({ hubId: hub.id, implementerId: hub.implementerId, projectId: hub.projectId })
    .from(hub)
    .innerJoin(project, eq(project.id, hub.projectId))
    .where(and(eq(project.isDefault, true), isNull(hub.archivedAt)))
    .orderBy(asc(hub.id))
    .limit(1);
  const member = defaultHub
    ? await db.query.implementerMember.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.implementerId, defaultHub.implementerId), eq(m.role, "ADMIN")),
        orderBy: (m, { asc }) => asc(m.id),
      })
    : undefined;
  if (!defaultHub || !member) throw new Error("Seed the database first");
  scope = { ...defaultHub, userId: member.userId };
  const printSchool = await createPrintSchool({
    hubId: scope.hubId,
    schoolName: `Review test school ${surveyCode}`,
  });
  schoolId = printSchool.schoolId;
  removeSchool = printSchool.remove;
  ({ versionId, id: surveyId } = await createPublishedSurvey({
    code: surveyCode,
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    form: PRINT_FORM,
  }));
});

afterAll(async () => {
  for (const remove of removals) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- each copy's rows, one copy at a time
    await remove();
  }
  await removeSurvey({ code: surveyCode });
  await removeSchool?.();
});

const removals: (() => Promise<void>)[] = [];

async function flaggedCopy() {
  const copy = await createScannedCopy({ scope, versionId, schoolId });
  removals.push(copy.remove);
  return copy;
}

async function stored(answerId: string) {
  const [answer] = await db
    .select({
      value: surveyAnswer.value,
      recognizedValue: surveyAnswer.recognizedValue,
      reviewStatus: surveyAnswer.reviewStatus,
      reviewedBy: surveyAnswer.reviewedBy,
      reviewedAt: surveyAnswer.reviewedAt,
    })
    .from(surveyAnswer)
    .where(eq(surveyAnswer.id, answerId));
  return answer;
}

// A decision made on a page that shows the answer as it stands now.
async function review(
  reviewerScope: AdminScope,
  answerId: string,
  decision: Parameters<typeof reviewAnswer>[2],
) {
  const reviewedAt = (await stored(answerId))?.reviewedAt?.toISOString() ?? null;
  return reviewAnswer(reviewerScope, answerId, decision, { reviewedAt });
}

async function copyStatus(questionnaireId: string) {
  const [copy] = await db
    .select({ status: surveyQuestionnaire.status })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.id, questionnaireId));
  return copy?.status;
}

describe("the review queue", () => {
  it("lists a copy's flagged answers in the order they are printed, and filters them", async () => {
    const { answerId } = await flaggedCopy();
    const mine = (ids: string[]) =>
      ids.filter((id) => [answerId("mood"), answerId("age"), answerId("notes")].includes(id));

    const queue = await fetchReviewQueue(scope, { surveyId });
    expect(mine(queue.answers.map((answer) => answer.id))).toEqual([
      answerId("mood"),
      answerId("age"),
      answerId("notes"),
    ]);
    expect(queue.answers.find((answer) => answer.id === answerId("age"))).toMatchObject({
      pageNumber: 2,
      prompt: "How old are you?",
      flags: ["BREAKS_FORM_RULE"],
    });

    const unread = await fetchReviewQueue(scope, { surveyId, flag: "NO_PREDICTION" });
    expect(mine(unread.answers.map((answer) => answer.id))).toEqual([answerId("notes")]);
  });

  it("shows nothing from another project, nor opens its answers", async () => {
    const { answerId } = await flaggedCopy();
    const elsewhere = { ...scope, projectId: "not-this-project" };

    expect((await fetchReviewQueue(elsewhere, { surveyId })).answers).toEqual([]);
    expect(await fetchAnswerForReview(elsewhere, answerId("mood"))).toBeNull();
    await expect(review(elsewhere, answerId("mood"), { kind: "accept" })).rejects.toThrow(
      "Answer not found",
    );
  });
});

describe("reviewing an answer", () => {
  it("stores a correction and keeps what the pipeline read, with the change in its history", async () => {
    const { answerId } = await flaggedCopy();

    expect(await review(scope, answerId("mood"), { kind: "correct", value: "2" })).toEqual({
      reviewStatus: "CORRECTED",
    });
    expect(await stored(answerId("mood"))).toMatchObject({
      value: "2",
      recognizedValue: null,
      reviewStatus: "CORRECTED",
      reviewedBy: scope.userId,
    });
    const opened = await fetchAnswerForReview(scope, answerId("mood"));
    expect(opened?.history).toMatchObject([
      {
        action: "ANSWER_CORRECTED",
        before: { value: null, reviewStatus: "NEEDS_REVIEW" },
        after: { value: "2", reviewStatus: "CORRECTED" },
      },
    ]);
  });

  it("stores handwritten text, digits and dates as the reviewer reads them", async () => {
    const { answerId } = await flaggedCopy();

    await review(scope, answerId("notes"), {
      kind: "correct",
      value: "  Plays football after school ",
    });
    await review(scope, answerId("age"), { kind: "correct", value: "014" });
    // A date the pipeline read cleanly can still be corrected from the paper.
    await review(scope, answerId("dob"), { kind: "correct", value: "2012-03-01" });

    expect(await stored(answerId("notes"))).toMatchObject({
      value: "Plays football after school",
      recognizedValue: null,
      reviewStatus: "CORRECTED",
    });
    expect(await stored(answerId("age"))).toMatchObject({ value: "014", recognizedValue: "150" });
    expect(await stored(answerId("dob"))).toMatchObject({
      value: "2012-03-01",
      recognizedValue: "2011-02-28",
      reviewStatus: "CORRECTED",
    });
    await expect(
      review(scope, answerId("dob"), { kind: "correct", value: "2012-02-30" }),
    ).rejects.toThrow("enter a real date");
  });

  it("refuses a correction the question's rules don't allow, and changes nothing", async () => {
    const { answerId } = await flaggedCopy();

    await expect(review(scope, answerId("mood"), { kind: "correct", value: "9" })).rejects.toThrow(
      "choose from the printed options",
    );
    await expect(
      review(scope, answerId("age"), { kind: "correct", value: "1500" }),
    ).rejects.toThrow("use at most 3 digits");
    await expect(review(scope, answerId("age"), { kind: "correct", value: "121" })).rejects.toThrow(
      "use a number from 0 to 120",
    );
    expect(await stored(answerId("age"))).toMatchObject({
      value: "150",
      reviewStatus: "NEEDS_REVIEW",
      reviewedBy: null,
    });
  });

  it("won't accept a value that breaks a rule", async () => {
    const { answerId } = await flaggedCopy();

    await expect(review(scope, answerId("age"), { kind: "accept" })).rejects.toThrow(
      "It can't be accepted: use a number from 0 to 120. Correct it instead.",
    );
    await expect(review(scope, answerId("age"), { kind: "accept" })).rejects.toThrow(SurveyError);
  });

  it("lets a reviewer confirm that a required question was left blank on paper", async () => {
    const { questionnaireId, answerId } = await flaggedCopy();

    expect(await review(scope, answerId("mood"), { kind: "accept" })).toEqual({
      reviewStatus: "VERIFIED",
    });
    expect(await stored(answerId("mood"))).toMatchObject({ value: null, reviewStatus: "VERIFIED" });
    await review(scope, answerId("age"), { kind: "correct", value: "14" });
    await review(scope, answerId("notes"), { kind: "accept" });
    expect(await copyStatus(questionnaireId)).toBe("READY");
  });

  it("refuses a decision made on a page that showed an older review", async () => {
    const { answerId } = await flaggedCopy();
    const openedBeforeAnyReview = { reviewedAt: null };

    await reviewAnswer(
      scope,
      answerId("mood"),
      { kind: "correct", value: "3" },
      openedBeforeAnyReview,
    );
    await expect(
      reviewAnswer(scope, answerId("mood"), { kind: "correct", value: "1" }, openedBeforeAnyReview),
    ).rejects.toThrow("Someone reviewed this answer while you had it open");
    expect(await stored(answerId("mood"))).toMatchObject({ value: "3" });
  });

  it("makes the copy READY once its last flagged answer is reviewed", async () => {
    const { questionnaireId, answerId } = await flaggedCopy();
    expect(await copyStatus(questionnaireId)).toBe("NEEDS_REVIEW");

    await review(scope, answerId("mood"), { kind: "correct", value: "3" });
    await review(scope, answerId("age"), { kind: "correct", value: "15" });
    expect(await copyStatus(questionnaireId)).toBe("NEEDS_REVIEW");
    // An optional answer the pipeline couldn't read, accepted as blank.
    await review(scope, answerId("notes"), { kind: "accept" });

    expect(await copyStatus(questionnaireId)).toBe("READY");
    expect(await stored(answerId("notes"))).toMatchObject({
      value: null,
      reviewStatus: "VERIFIED",
    });
  });

  it("counts a correction to the value it already has as accepting it, once", async () => {
    const { answerId } = await flaggedCopy();

    expect(await review(scope, answerId("notes"), { kind: "correct", value: "  " })).toEqual({
      reviewStatus: "VERIFIED",
    });
    await expect(review(scope, answerId("notes"), { kind: "accept" })).rejects.toThrow(
      "This answer has already been reviewed",
    );
  });

  it("lets a person verify an answer that was accepted automatically, once", async () => {
    const { answerId } = await flaggedCopy();
    expect(await stored(answerId("dob"))).toMatchObject({ reviewStatus: "AUTO_ACCEPTED" });

    expect(await review(scope, answerId("dob"), { kind: "accept" })).toEqual({
      reviewStatus: "VERIFIED",
    });
    await expect(review(scope, answerId("dob"), { kind: "accept" })).rejects.toThrow(
      "This answer has already been reviewed",
    );
  });

  it("refuses any change to a void copy's answers", async () => {
    const { questionnaireId, answerId } = await flaggedCopy();
    await db
      .update(surveyQuestionnaire)
      .set({ status: "VOID" })
      .where(eq(surveyQuestionnaire.id, questionnaireId));

    await expect(review(scope, answerId("mood"), { kind: "correct", value: "1" })).rejects.toThrow(
      "This copy is void, so its answers can't change",
    );
  });
});

describe("what a review shows", () => {
  it("names a grid row's question and cuts the row out with its neighbours", async () => {
    const [version] = await db
      .select({ form: surveyVersion.form, layout: surveyVersion.layout })
      .from(surveyVersion)
      .where(eq(surveyVersion.id, versionId));
    if (!version?.layout) throw new Error("No layout");

    expect(fieldQuestionOf(version.form, "phq.2")).toMatchObject({
      rowLabel: "Feeling down, depressed, or hopeless",
      required: true,
      input: { kind: "choice", multiple: false },
    });
    const page = version.layout.pages.find((candidate) => candidate.number === 2);
    if (!page) throw new Error("No page 2");
    const crop = fieldCropOf(page, version.layout.paper, "phq.2");
    if (!crop) throw new Error("No crop");
    expect(crop.view.y).toBeLessThan(crop.focus.y - 20);
    expect(crop.view.y + crop.view.h).toBeGreaterThan(crop.focus.y + crop.focus.h + 20);
    expect(crop.view.x).toBeLessThanOrEqual(crop.focus.x);
  });

  it("gives one page the same image link on every view, so the browser fetches it once", async () => {
    const { answerId } = await flaggedCopy();
    // Only Date is faked, so the database client's own timers keep running.
    vi.useFakeTimers({ toFake: ["Date"] });
    let first, again;
    try {
      vi.setSystemTime(new Date("2026-11-25T09:00:05Z"));
      first = await fetchAnswerForReview(scope, answerId("mood"));
      vi.setSystemTime(new Date("2026-11-25T09:00:35Z"));
      again = await fetchAnswerForReview(scope, answerId("mood"));
    } finally {
      vi.useRealTimers();
    }

    expect(first?.image?.url).toBeTruthy();
    expect(again?.image?.url).toBe(first?.image?.url);
  });

  it("opens a flagged answer with its question, its reading and its page image", async () => {
    const { answerId } = await flaggedCopy();

    const opened = await fetchAnswerForReview(scope, answerId("mood"));

    expect(opened).toMatchObject({
      field: "mood",
      readStatus: "UNCERTAIN",
      flags: ["UNCERTAIN"],
      reviewStatus: "NEEDS_REVIEW",
      question: { required: true, input: { kind: "choice", multiple: false } },
      copy: { pageNumber: 1 },
      image: { aligned: true },
      history: [],
    });
    expect(opened?.image?.url).toContain("pages/");
    expect(opened?.image?.crop?.view.w).toBeGreaterThan(0);
  });
});
