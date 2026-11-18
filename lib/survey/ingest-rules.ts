import {
  SurveyAnswerFlag,
  SurveyAnswerReadStatus,
  SurveyAnswerReviewStatus,
  SurveyFieldKind,
  SurveyQuestionnaireStatus,
  SurveyScanPageStatus,
  SurveyScanRejection,
} from "#/db/enums";
import type { JsonValue } from "#/db/schema";
import { gridRowField, isQuestion, type SurveyForm } from "#/lib/survey/form";
import { pageIdFromQrText } from "#/lib/survey/print-qr";
import {
  type FieldRead,
  type FieldReadDetail,
  type ParsedPage,
  READ_STATUS_OF_WIRE,
  type ReadPage,
  wireValueError,
} from "#/lib/survey/scan-wire";

export type PrintedPage = {
  questionnairePageId: string;
  pageNumber: number;
  copy: {
    id: string;
    surveyId: string;
    versionId: string;
    hubId: string;
    status: SurveyQuestionnaireStatus;
  };
};

export type PageIdentity =
  | { kind: "failed" }
  | { kind: "no-code" }
  | { kind: "codes-disagree" }
  | { kind: "unknown-code" }
  | { kind: "printed"; page: PrintedPage };

export function identifyPage(
  parsed: ParsedPage,
  printedPagesById: ReadonlyMap<string, PrintedPage>,
): PageIdentity {
  if (parsed.kind === "failed") return { kind: "failed" };
  if (parsed.page.qrs.length === 0) return { kind: "no-code" };
  const namedPages = parsed.page.qrs.map((qrText) => {
    const pageId = pageIdFromQrText(qrText);
    return pageId === undefined ? undefined : printedPagesById.get(pageId);
  });
  if (namedPages.includes(undefined)) return { kind: "unknown-code" };
  const [namedPage] = namedPages;
  if (
    !namedPage ||
    namedPages.some((page) => page?.questionnairePageId !== namedPage.questionnairePageId)
  ) {
    return { kind: "codes-disagree" };
  }
  return { kind: "printed", page: namedPage };
}

export type ScanOutcome =
  | {
      status: typeof SurveyScanPageStatus.REJECTED;
      rejectedReason: SurveyScanRejection;
      page: PrintedPage | null;
    }
  | { status: typeof SurveyScanPageStatus.UNIDENTIFIED }
  | { status: typeof SurveyScanPageStatus.DUPLICATE; page: PrintedPage; duplicateOfId: string }
  | { status: typeof SurveyScanPageStatus.MATCHED; page: PrintedPage };

export function decideOutcome(
  identity: PageIdentity,
  uploadHubId: string,
  otherMatchedScanId?: string,
): ScanOutcome {
  const rejected = (rejectedReason: SurveyScanRejection, page: PrintedPage | null = null) => ({
    status: SurveyScanPageStatus.REJECTED,
    rejectedReason,
    page,
  });
  switch (identity.kind) {
    case "failed":
      return rejected(SurveyScanRejection.UNREADABLE);
    case "unknown-code":
      return rejected(SurveyScanRejection.UNKNOWN_CODE);
    case "codes-disagree":
      return rejected(SurveyScanRejection.CODES_DISAGREE);
    case "no-code":
      return { status: SurveyScanPageStatus.UNIDENTIFIED };
    case "printed": {
      const { page } = identity;
      if (page.copy.status === SurveyQuestionnaireStatus.VOID) {
        return rejected(SurveyScanRejection.VOID_COPY, page);
      }
      if (page.copy.hubId !== uploadHubId) {
        return rejected(SurveyScanRejection.OTHER_HUB, page);
      }
      return otherMatchedScanId === undefined
        ? { status: SurveyScanPageStatus.MATCHED, page }
        : { status: SurveyScanPageStatus.DUPLICATE, page, duplicateOfId: otherMatchedScanId };
    }
  }
}

export type PriorScan = {
  id: string;
  attempt: number;
  postedSha256: string;
  status: SurveyScanPageStatus;
  questionnairePageId: string | null;
  questionnaireId: string | null;
  hasReviewedAnswers: boolean;
  hasDuplicates: boolean;
  copyStatus: SurveyQuestionnaireStatus | null;
};

export type RepostDecision =
  | { kind: "new" }
  | { kind: "unchanged"; status: SurveyScanPageStatus }
  | { kind: "conflict"; reason: string }
  | { kind: "replace"; prior: PriorScan };

export function decideRepost(
  prior: PriorScan | undefined,
  attempt: number,
  postedSha256: string,
): RepostDecision {
  if (!prior) return { kind: "new" };
  if (prior.attempt === attempt) {
    return prior.postedSha256 === postedSha256
      ? { kind: "unchanged", status: prior.status }
      : { kind: "conflict", reason: "this page was already posted with other content" };
  }
  if (prior.attempt > attempt) {
    return { kind: "conflict", reason: "a later attempt of this page is stored" };
  }
  if (prior.copyStatus === SurveyQuestionnaireStatus.VERIFIED || prior.hasReviewedAnswers) {
    return { kind: "conflict", reason: "this page's answers are already reviewed" };
  }
  if (prior.hasDuplicates) {
    return { kind: "conflict", reason: "another scan duplicates this page" };
  }
  return { kind: "replace", prior };
}

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.9;

export type AnswerRule = {
  required: boolean;
  confidenceThreshold: number;
  verifyAlways: boolean;
} & (
  | { kind: "choice"; codes: ReadonlySet<string> }
  | { kind: "digits"; digits: number; min?: number; max?: number }
  | { kind: "date" }
  | { kind: "text" }
  | { kind: "signature" }
);

export function answerRulesOf(form: SurveyForm): ReadonlyMap<string, AnswerRule> {
  const rules = new Map<string, AnswerRule>();
  for (const question of form.pages.flatMap((page) => page.items).filter(isQuestion)) {
    const base = {
      required: question.required,
      confidenceThreshold: question.review?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      verifyAlways: question.review?.verifyAlways ?? false,
    };
    switch (question.kind) {
      case "single_choice":
      case "multiple_choice":
        rules.set(question.key, {
          ...base,
          kind: "choice",
          codes: new Set(question.options.map((option) => option.code)),
        });
        break;
      case "grid": {
        const codes = new Set(question.options.map((option) => option.code));
        for (const row of question.rows) {
          rules.set(gridRowField(question.key, row.key), { ...base, kind: "choice", codes });
        }
        break;
      }
      case "number":
        rules.set(question.key, {
          ...base,
          kind: "digits",
          digits: question.digits,
          min: question.min,
          max: question.max,
        });
        break;
      case "date":
      case "text":
      case "signature":
        rules.set(question.key, { ...base, kind: question.kind });
        break;
    }
  }
  return rules;
}

export type PrintedField = { field: string; kind: SurveyFieldKind };

export type PlannedAnswer = {
  field: string;
  readStatus: SurveyAnswerReadStatus;
  recognizedValue: JsonValue | null;
  confidence: number | null;
  readDetail: FieldReadDetail | null;
  flags: SurveyAnswerFlag[];
};

export function planAnswers({
  page,
  printedFields,
  rules,
  kindsUnderReview,
}: {
  page: ReadPage;
  printedFields: readonly PrintedField[];
  rules: ReadonlyMap<string, AnswerRule>;
  kindsUnderReview: ReadonlySet<SurveyFieldKind>;
}): { ok: true; answers: PlannedAnswer[] } | { ok: false; reason: string } {
  const kindOfPrintedField = new Map(printedFields.map(({ field, kind }) => [field, kind]));
  for (const read of page.fields) {
    const kind = kindOfPrintedField.get(read.field);
    if (kind === undefined) {
      return { ok: false, reason: `${read.field} is not printed on this page` };
    }
    const shapeError = read.value === null ? undefined : wireValueError(kind, read.value);
    if (shapeError) {
      return { ok: false, reason: `${read.field}: ${shapeError}` };
    }
  }
  const readOfField = new Map(page.fields.map((read) => [read.field, read]));
  const answers = printedFields.map(({ field, kind }): PlannedAnswer => {
    const rule = rules.get(field);
    if (!rule) {
      throw new Error(`The form has no question for printed field ${field}`);
    }
    const read = readOfField.get(field);
    if (!read) {
      return {
        field,
        readStatus: SurveyAnswerReadStatus.NO_PREDICTION,
        recognizedValue: null,
        confidence: null,
        readDetail: null,
        flags: reviewFlagsOf({
          read: { status: "no_prediction", value: null, confidence: null },
          kind,
          rule,
          aligned: page.aligned,
          kindsUnderReview,
        }),
      };
    }
    return {
      field,
      readStatus: READ_STATUS_OF_WIRE[read.status],
      recognizedValue: read.value,
      confidence: read.confidence ?? null,
      readDetail:
        read.raw === undefined && read.marks === undefined
          ? null
          : { raw: read.raw, marks: read.marks },
      flags: reviewFlagsOf({ read, kind, rule, aligned: page.aligned, kindsUnderReview }),
    };
  });
  return { ok: true, answers };
}

export function reviewStatusOf(flags: readonly SurveyAnswerFlag[]) {
  return flags.length === 0
    ? SurveyAnswerReviewStatus.AUTO_ACCEPTED
    : SurveyAnswerReviewStatus.NEEDS_REVIEW;
}

function reviewFlagsOf({
  read,
  kind,
  rule,
  aligned,
  kindsUnderReview,
}: {
  read: Pick<FieldRead, "status" | "value" | "confidence">;
  kind: SurveyFieldKind;
  rule: AnswerRule;
  aligned: boolean;
  kindsUnderReview: ReadonlySet<SurveyFieldKind>;
}): SurveyAnswerFlag[] {
  const flags: SurveyAnswerFlag[] = [];
  if (read.status === "uncertain") flags.push(SurveyAnswerFlag.UNCERTAIN);
  if (read.status === "no_prediction") flags.push(SurveyAnswerFlag.NO_PREDICTION);
  if (read.status === "blank" && rule.required) flags.push(SurveyAnswerFlag.BLANK_REQUIRED);
  if (read.value !== null && !keepsFormRule(rule, read.value)) {
    flags.push(SurveyAnswerFlag.BREAKS_FORM_RULE);
  }
  if (!aligned) flags.push(SurveyAnswerFlag.NOT_ALIGNED);
  if (rule.verifyAlways) flags.push(SurveyAnswerFlag.VERIFY_ALWAYS);
  if (kind === SurveyFieldKind.TEXT && read.status !== "blank") {
    flags.push(SurveyAnswerFlag.HANDWRITING);
  }
  if (read.confidence != null && read.confidence < rule.confidenceThreshold) {
    flags.push(SurveyAnswerFlag.LOW_CONFIDENCE);
  }
  if (kindsUnderReview.has(kind)) flags.push(SurveyAnswerFlag.KIND_UNDER_REVIEW);
  return flags;
}

function keepsFormRule(rule: AnswerRule, value: string | string[] | true): boolean {
  switch (rule.kind) {
    case "choice":
      return (Array.isArray(value) ? value : [value]).every(
        (code) => typeof code === "string" && rule.codes.has(code),
      );
    case "digits": {
      if (typeof value !== "string" || value.length > rule.digits) return false;
      const number = Number(value);
      return (
        (rule.min === undefined || number >= rule.min) &&
        (rule.max === undefined || number <= rule.max)
      );
    }
    case "date": {
      if (typeof value !== "string") return false;
      const [year, month, day] = value.split("-").map(Number);
      if (year === undefined || month === undefined || day === undefined) return false;
      const date = new Date(Date.UTC(year, month - 1, day));
      return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
      );
    }
    case "text":
    case "signature":
      return true;
  }
}

export function copyStatusOf({
  current,
  printedPages,
  matchedPages,
  answersNeedingReview,
}: {
  current: SurveyQuestionnaireStatus;
  printedPages: number;
  matchedPages: number;
  answersNeedingReview: number;
}): SurveyQuestionnaireStatus {
  if (
    current === SurveyQuestionnaireStatus.VOID ||
    current === SurveyQuestionnaireStatus.VERIFIED
  ) {
    return current;
  }
  if (matchedPages === 0) return SurveyQuestionnaireStatus.ISSUED;
  if (matchedPages < printedPages) return SurveyQuestionnaireStatus.PARTIAL;
  return answersNeedingReview > 0
    ? SurveyQuestionnaireStatus.NEEDS_REVIEW
    : SurveyQuestionnaireStatus.READY;
}
