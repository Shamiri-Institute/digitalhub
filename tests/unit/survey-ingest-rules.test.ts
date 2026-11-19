// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { SurveyFieldKind } from "#/db/enums";
import { objectId } from "#/lib/crypto";
import type { SurveyForm } from "#/lib/survey/form";
import {
  answerRulesOf,
  copyStatusOf,
  decideOutcome,
  decideRepost,
  identifyPage,
  planAnswers,
  type PrintedPage,
  type StoredScan,
} from "#/lib/survey/ingest-rules";
import { pageQrText } from "#/lib/survey/print-qr";
import { type FieldRead, parsePostedPage, type ReadPage } from "#/lib/survey/scan-wire";
import { PRINT_FORM } from "./fixtures/survey-print-form";

const PAGE_ONE_FIELDS = [
  { field: "home", kind: "SINGLE_CHOICE" },
  { field: "mood", kind: "SINGLE_CHOICE" },
  { field: "sport", kind: "MULTIPLE_CHOICE" },
] as const;
const PAGE_TWO_FIELDS = [
  { field: "age", kind: "DIGITS" },
  { field: "dob", kind: "DATE" },
  { field: "phq.1", kind: "SINGLE_CHOICE" },
] as const;
const PAGE_THREE_FIELDS = [
  { field: "notes", kind: "TEXT" },
  { field: "sign", kind: "SIGNATURE" },
] as const;

const REVIEWED_FORM: SurveyForm = {
  ...PRINT_FORM,
  pages: PRINT_FORM.pages.map((page) => ({
    ...page,
    items: page.items.map((item) => {
      if (!("key" in item)) return item;
      if (item.key === "mood") return { ...item, review: { confidenceThreshold: 0.5 } };
      if (item.key === "home") return { ...item, review: { verifyAlways: true } };
      return item;
    }),
  })),
};

function ok(field: string, value: NonNullable<FieldRead["value"]>): FieldRead {
  return { field, value, status: "ok", confidence: 0.99 };
}

function readPage(fields: FieldRead[], overrides: Partial<ReadPage> = {}): ReadPage {
  return { pageIndex: 0, qrs: [], rotation: 0, aligned: true, quality: 0.9, fields, ...overrides };
}

const CLEAN_PAGE_ONE = [ok("home", "1"), ok("mood", "3"), ok("sport", ["football"])];
const CLEAN_PAGE_TWO = [ok("age", "14"), ok("dob", "2011-02-28"), ok("phq.1", "0")];

function plan(
  fields: FieldRead[],
  {
    printedFields = PAGE_ONE_FIELDS,
    aligned = true,
    kindsUnderReview = [],
    form = REVIEWED_FORM,
  }: {
    printedFields?: readonly { field: string; kind: SurveyFieldKind }[];
    aligned?: boolean;
    kindsUnderReview?: SurveyFieldKind[];
    form?: SurveyForm;
  } = {},
) {
  return planAnswers({
    page: readPage(fields, { aligned }),
    printedFields,
    rules: answerRulesOf(form),
    kindsUnderReview: new Set(kindsUnderReview),
  });
}

function flagsOf(planned: ReturnType<typeof plan>) {
  if (!planned.ok) throw new Error(planned.reason);
  return Object.fromEntries(planned.answers.map((answer) => [answer.field, answer.flags]));
}

describe("a posted page", () => {
  it("hashes its content, not the order of its keys or keys the SDH ignores", () => {
    const posted = {
      pageIndex: 2,
      qrs: ["A"],
      rotation: 90,
      aligned: true,
      quality: 0.8,
      fields: [{ field: "mood", value: "3", status: "ok", confidence: 0.9 }],
    };
    const reordered = {
      fields: [{ confidence: 0.9, status: "ok", value: "3", field: "mood", box: [1, 2] }],
      quality: 0.8,
      aligned: true,
      rotation: 90,
      qrs: ["A"],
      pageIndex: 2,
      pipelineVersion: "7",
    };
    const changed = { ...posted, quality: 0.7 };
    const [first, second, third] = [posted, reordered, changed].map(parsePostedPage);
    if (!first?.ok || !second?.ok || !third?.ok) throw new Error("Not parsed");
    expect(first.postedSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(second.postedSha256).toBe(first.postedSha256);
    expect(third.postedSha256).not.toBe(first.postedSha256);
    expect(second.parsed).toEqual({ kind: "read", page: posted });
  });

  it("hashes and stores its codes and its field reads as sets, not in the order posted", () => {
    const posted = {
      pageIndex: 2,
      qrs: ["B", "A"],
      rotation: 0,
      aligned: true,
      quality: 0.8,
      fields: [ok("mood", "3"), ok("home", "1")],
    };
    const reordered = { ...posted, qrs: ["A", "B"], fields: [ok("home", "1"), ok("mood", "3")] };
    const [first, second] = [posted, reordered].map(parsePostedPage);
    if (!first?.ok || !second?.ok) throw new Error("Not parsed");
    expect(second.postedSha256).toBe(first.postedSha256);
    expect(first.parsed).toEqual({ kind: "read", page: reordered });
  });

  it("hashes and stores a multiple choice and its marks as sets, not in the order posted", () => {
    const sportRead = (codes: string[]) => ({
      ...ok("sport", codes),
      marks: codes.map((code) => ({ code, fill: code === "football" ? 0.9 : 0.6 })),
    });
    const page = { pageIndex: 0, qrs: [], rotation: 0, aligned: true, quality: 1 };
    const [first, second] = [
      { ...page, fields: [sportRead(["netball", "football"])] },
      { ...page, fields: [sportRead(["football", "netball"])] },
    ].map(parsePostedPage);
    if (!first?.ok || !second?.ok) throw new Error("Not parsed");
    expect(second.postedSha256).toBe(first.postedSha256);
    expect(first.parsed).toEqual({
      kind: "read",
      page: { ...page, fields: [sportRead(["football", "netball"])] },
    });
  });

  it("is a failed page when it carries an error", () => {
    expect(parsePostedPage({ pageIndex: 3, error: "no image", qrs: [] })).toEqual({
      ok: true,
      parsed: { kind: "failed", page: { pageIndex: 3, error: "no image" } },
      postedSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("is refused, with the reason, when it breaks the wire's rules", () => {
    const page = { pageIndex: 0, qrs: [], rotation: 0, aligned: true, quality: 1 };
    const reasonOf = (posted: Record<string, unknown>) => {
      const parsed = parsePostedPage({ ...page, ...posted });
      return parsed.ok ? undefined : parsed.reason;
    };
    expect(reasonOf({ fields: [{ field: "mood", value: "3", status: "blank" }] })).toBe(
      "fields.0: value is set exactly when status is ok",
    );
    expect(reasonOf({ fields: [{ field: "mood", value: null, status: "ok" }] })).toBe(
      "fields.0: value is set exactly when status is ok",
    );
    expect(
      reasonOf({
        fields: [
          { field: "mood", value: null, status: "blank" },
          { field: "mood", value: null, status: "uncertain" },
        ],
      }),
    ).toBe("a field is posted twice");
    expect(reasonOf({ fields: [{ field: "notes", value: 12, status: "ok" }] })).toMatch(
      /^fields\.0\.value: /,
    );
    expect(reasonOf({ fields: [], rotation: 45 })).toMatch(/^rotation: /);
    expect(reasonOf({ fields: [], quality: 2 })).toMatch(/^quality: /);
    expect(reasonOf({})).toMatch(/^fields: /);
  });

  it("is refused when its page index or a field name is one Postgres could not store", () => {
    const page = { pageIndex: 0, qrs: [], rotation: 0, aligned: true, quality: 1, fields: [] };
    const reasonOf = (posted: Record<string, unknown>) => {
      const parsed = parsePostedPage({ ...page, ...posted });
      return parsed.ok ? undefined : parsed.reason;
    };
    expect(reasonOf({ pageIndex: 2147483647 })).toBeUndefined();
    expect(reasonOf({ pageIndex: 2147483648 })).toMatch(/^pageIndex: /);
    expect(parsePostedPage({ pageIndex: 2147483648, error: "no image" })).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/^pageIndex: /),
    });
    expect(reasonOf({ fields: [ok("mood\u0000", "3")] })).toBe(
      "fields.0.field: text must be well-formed Unicode without U+0000",
    );
    expect(reasonOf({ fields: [ok("mood\ud800", "3")] })).toBe(
      "fields.0.field: text must be well-formed Unicode without U+0000",
    );
  });

  it("stores and hashes its free text with what Postgres can't store taken out", () => {
    const page = { pageIndex: 0, rotation: 0, aligned: true, quality: 1 };
    const posted = parsePostedPage({
      ...page,
      qrs: ["A\u0000"],
      fields: [
        { ...ok("notes", "hi\u0000 x\ud800"), raw: "h\u0000i" },
        {
          ...ok("sport", ["foot\u0000ball", "net\udc00"]),
          marks: [{ code: "foot\u0000ball", fill: 1 }],
        },
      ],
    });
    const cleaned = parsePostedPage({
      ...page,
      qrs: ["A"],
      fields: [
        { ...ok("notes", "hi x\ufffd"), raw: "hi" },
        { ...ok("sport", ["football", "net\ufffd"]), marks: [{ code: "football", fill: 1 }] },
      ],
    });
    if (!posted.ok || !cleaned.ok) throw new Error("Not parsed");
    expect(posted).toEqual(cleaned);
    expect(parsePostedPage({ pageIndex: 0, error: "no\u0000 image\ud800" })).toEqual({
      ok: true,
      parsed: { kind: "failed", page: { pageIndex: 0, error: "no image\ufffd" } },
      postedSha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("is refused when a field marks one code twice", () => {
    const parsed = parsePostedPage({
      pageIndex: 0,
      qrs: [],
      rotation: 0,
      aligned: true,
      quality: 1,
      fields: [
        {
          ...ok("sport", ["football"]),
          marks: [
            { code: "football", fill: 0.9 },
            { code: "football", fill: 0.4 },
          ],
        },
      ],
    });
    expect(parsed).toEqual({ ok: false, reason: "fields.0.marks: a code is marked twice" });
  });

  it("reads a confidence left out as no confidence", () => {
    const page = { pageIndex: 0, qrs: [], rotation: 0, aligned: true, quality: 1 };
    const [left, nulled] = [
      { field: "mood", value: null, status: "blank" },
      { field: "mood", value: null, status: "blank", confidence: null },
    ].map((read) => parsePostedPage({ ...page, fields: [read] }));
    if (!left?.ok || !nulled?.ok) throw new Error("Not parsed");
    expect(left).toEqual(nulled);
  });
});

function printedPage(copy: Partial<PrintedPage["copy"]> = {}): PrintedPage {
  return {
    questionnairePageId: objectId("surveyquestionnairepage"),
    pageNumber: 1,
    copy: {
      id: "copy",
      surveyId: "survey",
      versionId: "version",
      hubId: "hub",
      status: "ISSUED",
      ...copy,
    },
  };
}

describe("identifying a page", () => {
  const page = printedPage();
  const otherPage = printedPage();
  const printedPagesById = new Map(
    [page, otherPage].map((printed) => [printed.questionnairePageId, printed]),
  );
  const identify = (qrs: string[]) =>
    identifyPage({ kind: "read", page: readPage([], { qrs }) }, printedPagesById);
  const qrOf = (printed: PrintedPage) => pageQrText(printed.questionnairePageId);

  it("names the page its codes agree on, past a code that isn't a page's", () => {
    expect(identify([qrOf(page), qrOf(page)])).toEqual({ kind: "printed", page });
    expect(identify([qrOf(page)])).toEqual({ kind: "printed", page });
    expect(identify([qrOf(page), "SCHOOL-STAMP", qrOf(page)])).toEqual({ kind: "printed", page });
  });

  it("never guesses between codes that name different pages, or a code that is no page's", () => {
    expect(identify([])).toEqual({ kind: "no-code" });
    expect(identify(["SCHOOL-STAMP"])).toEqual({ kind: "no-code" });
    expect(identify([qrOf(page), qrOf(otherPage)])).toEqual({ kind: "codes-disagree" });
    const unprintedQr = pageQrText(objectId("surveyquestionnairepage"));
    expect(identify([unprintedQr])).toEqual({ kind: "unknown-code" });
    expect(identify([qrOf(page), unprintedQr])).toEqual({ kind: "unknown-code" });
    expect(
      identifyPage({ kind: "failed", page: { pageIndex: 0, error: "no image" } }, printedPagesById),
    ).toEqual({ kind: "failed" });
  });
});

describe("a page's outcome", () => {
  it("is REJECTED before UNIDENTIFIED, DUPLICATE or MATCHED", () => {
    const voidPage = printedPage({ status: "VOID" });
    const otherHubPage = printedPage({ hubId: "other hub" });
    const verifiedPage = printedPage({ status: "VERIFIED" });
    const verifiedOtherHubPage = printedPage({ status: "VERIFIED", hubId: "other hub" });
    const page = printedPage();
    expect(decideOutcome({ kind: "printed", page: voidPage }, "hub", "matched scan")).toEqual({
      status: "REJECTED",
      rejectedReason: "VOID_COPY",
      page: voidPage,
    });
    expect(decideOutcome({ kind: "printed", page: otherHubPage }, "hub", "matched scan")).toEqual({
      status: "REJECTED",
      rejectedReason: "OTHER_HUB",
      page: otherHubPage,
    });
    expect(decideOutcome({ kind: "printed", page: verifiedPage }, "hub", "matched scan")).toEqual({
      status: "REJECTED",
      rejectedReason: "VERIFIED_COPY",
      page: verifiedPage,
    });
    expect(decideOutcome({ kind: "printed", page: verifiedOtherHubPage }, "hub")).toEqual({
      status: "REJECTED",
      rejectedReason: "OTHER_HUB",
      page: verifiedOtherHubPage,
    });
    const voidOtherHubPage = printedPage({ status: "VOID", hubId: "other hub" });
    expect(decideOutcome({ kind: "printed", page: voidOtherHubPage }, "hub")).toEqual({
      status: "REJECTED",
      rejectedReason: "OTHER_HUB",
      page: voidOtherHubPage,
    });
    expect(decideOutcome({ kind: "failed" }, "hub")).toEqual({
      status: "REJECTED",
      rejectedReason: "UNREADABLE",
      page: null,
    });
    expect(decideOutcome({ kind: "unknown-code" }, "hub")).toEqual({
      status: "REJECTED",
      rejectedReason: "UNKNOWN_CODE",
      page: null,
    });
    expect(decideOutcome({ kind: "codes-disagree" }, "hub")).toEqual({
      status: "REJECTED",
      rejectedReason: "CODES_DISAGREE",
      page: null,
    });
    expect(decideOutcome({ kind: "no-code" }, "hub")).toEqual({
      status: "UNIDENTIFIED",
      page: null,
    });
    expect(decideOutcome({ kind: "printed", page }, "hub", "matched scan")).toEqual({
      status: "DUPLICATE",
      page,
      duplicateOfId: "matched scan",
    });
    expect(decideOutcome({ kind: "printed", page }, "hub")).toEqual({
      status: "MATCHED",
      page,
    });
  });
});

describe("a re-post", () => {
  const matched: StoredScan = {
    attempt: 1,
    postedSha256: "a".repeat(64),
    status: "MATCHED",
    questionnairePageId: "page",
  };
  const unplaced: StoredScan = {
    attempt: 1,
    postedSha256: "a".repeat(64),
    status: "REJECTED",
    questionnairePageId: null,
  };

  it("of the same attempt changes nothing, and other content replaces only a page that names no printed page", () => {
    expect(decideRepost(undefined, 1, "a".repeat(64))).toEqual({ kind: "new" });
    for (const storedScan of [matched, unplaced]) {
      expect(decideRepost(storedScan, 1, "a".repeat(64))).toEqual({
        kind: "unchanged",
        status: storedScan.status,
      });
    }
    expect(decideRepost(unplaced, 1, "b".repeat(64))).toEqual({ kind: "replace" });
    expect(decideRepost(matched, 1, "b".repeat(64))).toEqual({
      kind: "conflict",
      reason: "this page was already posted with other content",
    });
  });

  it("of another attempt reading the page the same leaves a placed page, and takes its image for an unplaced one", () => {
    expect(decideRepost(matched, 2, "a".repeat(64))).toEqual({
      kind: "unchanged",
      status: matched.status,
    });
    expect(decideRepost(unplaced, 2, "a".repeat(64))).toEqual({ kind: "replace" });
  });

  it("of another attempt reading it otherwise replaces only a page that names no printed page", () => {
    expect(decideRepost(unplaced, 2, "b".repeat(64))).toEqual({ kind: "replace" });
    expect(decideRepost(matched, 2, "b".repeat(64))).toEqual({
      kind: "conflict",
      reason: "already stored by attempt 1",
    });
  });
});

describe("a matched page's answers", () => {
  it("are one per printed field, each grid row its own", () => {
    expect([...answerRulesOf(PRINT_FORM).keys()].toSorted()).toEqual([
      "age",
      "dob",
      "home",
      "mood",
      "notes",
      "phq.1",
      "phq.2",
      "phq.3",
      "phq.4",
      "phq.5",
      "sign",
      "sport",
    ]);
    expect(plan(CLEAN_PAGE_ONE, { form: PRINT_FORM })).toEqual({
      ok: true,
      answers: [
        {
          field: "home",
          readStatus: "OK",
          recognizedValue: "1",
          confidence: 0.99,
          readDetail: null,
          flags: [],
        },
        {
          field: "mood",
          readStatus: "OK",
          recognizedValue: "3",
          confidence: 0.99,
          readDetail: null,
          flags: [],
        },
        {
          field: "sport",
          readStatus: "OK",
          recognizedValue: ["football"],
          confidence: 0.99,
          readDetail: null,
          flags: [],
        },
      ],
    });
  });

  it("keep what the pipeline saw of a field", () => {
    const planned = plan([
      { ...ok("mood", "3"), raw: "3?", marks: [{ code: "3", fill: 0.8 }] },
      { field: "home", value: null, status: "uncertain", confidence: null, raw: "" },
      { field: "sport", value: null, status: "blank", confidence: null },
    ]);
    if (!planned.ok) throw new Error(planned.reason);
    expect(
      planned.answers.map(({ field, readStatus, readDetail, confidence }) => ({
        field,
        readStatus,
        readDetail,
        confidence,
      })),
    ).toEqual([
      { field: "home", readStatus: "UNCERTAIN", readDetail: { raw: "" }, confidence: null },
      {
        field: "mood",
        readStatus: "OK",
        readDetail: { raw: "3?", marks: [{ code: "3", fill: 0.8 }] },
        confidence: 0.99,
      },
      { field: "sport", readStatus: "BLANK", readDetail: null, confidence: null },
    ]);
  });

  it("make the page invalid when a field isn't printed on it or has the wrong shape for its kind", () => {
    expect(plan([...CLEAN_PAGE_ONE, ok("age", "14")])).toEqual({
      ok: false,
      reason: "age is not printed on this page",
    });
    const shapeReason = (
      field: { field: string; kind: SurveyFieldKind },
      value: NonNullable<FieldRead["value"]>,
    ) => plan([ok(field.field, value)], { printedFields: [field] });
    expect(shapeReason({ field: "mood", kind: "SINGLE_CHOICE" }, ["3"])).toEqual({
      ok: false,
      reason: "mood: a single choice is one option code",
    });
    expect(shapeReason({ field: "sport", kind: "MULTIPLE_CHOICE" }, "football")).toEqual({
      ok: false,
      reason: "sport: a multiple choice is a list of option codes",
    });
    expect(shapeReason({ field: "sport", kind: "MULTIPLE_CHOICE" }, ["none", "none"])).toEqual({
      ok: false,
      reason: "sport: an option code is repeated",
    });
    expect(shapeReason({ field: "age", kind: "DIGITS" }, "1a")).toEqual({
      ok: false,
      reason: "age: digits are a string of 0-9",
    });
    expect(shapeReason({ field: "dob", kind: "DATE" }, "1/2/2020")).toEqual({
      ok: false,
      reason: "dob: a date is YYYY-MM-DD",
    });
    expect(shapeReason({ field: "notes", kind: "TEXT" }, true)).toEqual({
      ok: false,
      reason: "notes: text is a string",
    });
    expect(shapeReason({ field: "sign", kind: "SIGNATURE" }, "yes")).toEqual({
      ok: false,
      reason: "sign: a signature is true",
    });
  });

  it("are stored and sent to review when they break the form's rules", () => {
    expect(
      flagsOf(
        plan([ok("age", "121"), ok("dob", "2024-02-30"), ok("phq.1", "4")], {
          printedFields: PAGE_TWO_FIELDS,
        }),
      ),
    ).toEqual({
      age: ["BREAKS_FORM_RULE"],
      dob: ["BREAKS_FORM_RULE"],
      "phq.1": ["BREAKS_FORM_RULE"],
    });
    expect(
      flagsOf(
        plan([ok("age", "0014"), ok("dob", "2024-02-29"), ok("phq.1", "3")], {
          printedFields: PAGE_TWO_FIELDS,
        }),
      ),
    ).toEqual({ age: ["BREAKS_FORM_RULE"], dob: [], "phq.1": [] });
    expect(
      flagsOf(plan([ok("home", "9"), ok("mood", "3"), ok("sport", ["football", "chess"])])),
    ).toEqual({
      home: ["BREAKS_FORM_RULE", "VERIFY_ALWAYS"],
      mood: [],
      sport: ["BREAKS_FORM_RULE"],
    });
  });

  it("go to review for each rule they break, and are accepted only when they break none", () => {
    expect(flagsOf(plan(CLEAN_PAGE_TWO, { printedFields: PAGE_TWO_FIELDS }))).toEqual({
      age: [],
      dob: [],
      "phq.1": [],
    });
    expect(
      flagsOf(
        plan(
          [
            { field: "age", value: null, status: "uncertain", confidence: null },
            { ...ok("dob", "2011-02-28"), confidence: 0.85 },
            { ...ok("phq.1", "0"), confidence: null },
          ],
          { printedFields: PAGE_TWO_FIELDS },
        ),
      ),
    ).toEqual({ age: ["UNCERTAIN"], dob: ["LOW_CONFIDENCE"], "phq.1": [] });
    expect(
      flagsOf(
        plan([
          { ...ok("home", "1") },
          { ...ok("mood", "3"), confidence: 0.6 },
          { ...ok("sport", ["netball"]), confidence: 0.6 },
        ]),
      ),
    ).toEqual({ home: ["VERIFY_ALWAYS"], mood: [], sport: ["LOW_CONFIDENCE"] });
    expect(
      flagsOf(
        plan([ok("notes", "I like school"), ok("sign", true)], {
          printedFields: PAGE_THREE_FIELDS,
        }),
      ),
    ).toEqual({ notes: [], sign: [] });
    expect(
      flagsOf(plan(CLEAN_PAGE_TWO, { printedFields: PAGE_TWO_FIELDS, aligned: false })),
    ).toEqual({ age: ["NOT_ALIGNED"], dob: ["NOT_ALIGNED"], "phq.1": ["NOT_ALIGNED"] });
  });

  it("go to review for a field kind switched to review, and only that kind", () => {
    expect(
      flagsOf(plan(CLEAN_PAGE_TWO, { printedFields: PAGE_TWO_FIELDS, kindsUnderReview: ["DATE"] })),
    ).toEqual({ age: [], dob: ["KIND_UNDER_REVIEW"], "phq.1": [] });
  });

  it("are NO_PREDICTION for a printed field the post leaves out", () => {
    const planned = plan([ok("home", "1"), ok("sport", ["none"])]);
    if (!planned.ok) throw new Error(planned.reason);
    expect(planned.answers.find((answer) => answer.field === "mood")).toEqual({
      field: "mood",
      readStatus: "NO_PREDICTION",
      recognizedValue: null,
      confidence: null,
      readDetail: null,
      flags: ["NO_PREDICTION"],
    });
  });

  it("raise no flag of their own for a blank optional answer, but still apply the other rules to it", () => {
    const blankPage = [
      { field: "notes", value: null, status: "blank" as const, confidence: null },
      { field: "sign", value: null, status: "blank" as const, confidence: null },
    ];
    expect(flagsOf(plan(blankPage, { printedFields: PAGE_THREE_FIELDS }))).toEqual({
      notes: [],
      sign: ["BLANK_REQUIRED"],
    });
    expect(flagsOf(plan(blankPage, { printedFields: PAGE_THREE_FIELDS, aligned: false }))).toEqual({
      notes: ["NOT_ALIGNED"],
      sign: ["BLANK_REQUIRED", "NOT_ALIGNED"],
    });
  });
});

describe("a copy's status", () => {
  const status = (
    current: Parameters<typeof copyStatusOf>[0]["current"],
    matchedPages: number,
    answersNeedingReview = 0,
  ) => copyStatusOf({ current, printedPages: 3, matchedPages, answersNeedingReview });

  it("is PARTIAL until every page is in, then NEEDS_REVIEW or READY", () => {
    expect(status("ISSUED", 1)).toBe("PARTIAL");
    expect(status("PARTIAL", 3, 1)).toBe("NEEDS_REVIEW");
    expect(status("PARTIAL", 3)).toBe("READY");
    expect(status("NEEDS_REVIEW", 3)).toBe("READY");
    expect(status("READY", 0)).toBe("ISSUED");
  });

  it("never moves once VERIFIED or VOID", () => {
    expect(status("VERIFIED", 3, 2)).toBe("VERIFIED");
    expect(status("VOID", 3)).toBe("VOID");
  });
});
