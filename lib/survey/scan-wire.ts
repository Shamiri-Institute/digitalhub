import { createHash } from "node:crypto";

import { z } from "zod";

import { SurveyAnswerReadStatus, SurveyFieldKind } from "#/db/enums";
import { base64Checksum, hexChecksum } from "#/lib/s3/utils/checksum";

export const MAX_PAGES_PER_POST = 200;

export const PagePostBodySchema = z.object({
  pages: z
    .array(z.looseObject({ pageIndex: z.int().min(0) }))
    .min(1)
    .max(MAX_PAGES_PER_POST),
});
export type PostedPage = z.output<typeof PagePostBodySchema>["pages"][number];

const WIRE_READ_STATUSES = ["ok", "uncertain", "blank", "no_prediction"] as const;
type WireReadStatus = (typeof WIRE_READ_STATUSES)[number];

// Postgres keeps no U+0000 or lone surrogate in text or jsonb, and stores the page index as int4.
// A field name is an id, so one it can't store is refused; free text is stored without them.
const StoredText = z.string().refine((text) => text.isWellFormed() && !text.includes("\u0000"), {
  error: "text must be well-formed Unicode without U+0000",
});
export const storable = (text: string) => text.toWellFormed().replaceAll("\u0000", "");
const FreeText = z.string().transform(storable);
export const StoredPageIndex = z.int32().min(0);
// Stored as it can be; one made only of what Postgres can't store still says something.
export const PipelineErrorText = z
  .string()
  .min(1)
  .max(2000)
  .transform((text) => storable(text) || "no readable error text");
// Only the standard spelling: S3 is given it as sent and the SDH compares it decoded.
export const Sha256Base64 = z
  .base64()
  .refine((checksum) => base64Checksum(hexChecksum(checksum)) === checksum, {
    error: "a SHA-256 in standard base64",
  })
  .refine((checksum) => Buffer.from(checksum, "base64").length === 32, {
    error: "a SHA-256 in base64",
  });

const FieldReadSchema = z
  .object({
    field: StoredText.min(1).max(200),
    value: z
      .union([FreeText, z.array(FreeText).min(1), z.literal(true)])
      .nullable()
      .transform((value) => (Array.isArray(value) ? value.toSorted() : value)),
    raw: z.string().max(2000).transform(storable).optional(),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .nullish()
      .transform((confidence) => confidence ?? null),
    status: z.enum(WIRE_READ_STATUSES),
    marks: z
      .array(z.object({ code: FreeText, fill: z.number().min(0).max(1) }))
      .refine((marks) => new Set(marks.map((mark) => mark.code)).size === marks.length, {
        error: "a code is marked twice",
      })
      .transform((marks) => marks.toSorted((a, b) => (a.code < b.code ? -1 : 1)))
      .optional(),
  })
  .refine((read) => (read.value !== null) === (read.status === "ok"), {
    error: "value is set exactly when status is ok",
  });

const ReadPageSchema = z
  .object({
    pageIndex: StoredPageIndex,
    qrs: z.array(z.string().max(512).transform(storable)).max(8),
    rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
    aligned: z.boolean(),
    quality: z.number().min(0).max(1),
    fields: z.array(FieldReadSchema),
    // The image the page was read from. A page the SDH already placed is posted without one.
    imageSha256: z.preprocess((checksum) => checksum ?? undefined, Sha256Base64.optional()),
  })
  .refine((page) => new Set(page.fields.map((read) => read.field)).size === page.fields.length, {
    error: "a field is posted twice",
  })
  .transform((page) => ({
    ...page,
    qrs: page.qrs.toSorted(),
    fields: page.fields.toSorted((a, b) => (a.field < b.field ? -1 : 1)),
  }));

const FailedPageSchema = z.object({
  pageIndex: StoredPageIndex,
  error: PipelineErrorText,
});

export type ReadPage = z.output<typeof ReadPageSchema>;
export type FailedPage = z.output<typeof FailedPageSchema>;
export type FieldRead = ReadPage["fields"][number];
export type FieldReadDetail = Pick<FieldRead, "raw" | "marks">;
export type ParsedPage = { kind: "read"; page: ReadPage } | { kind: "failed"; page: FailedPage };

export function parsePostedPage(
  posted: PostedPage,
): { ok: true; parsed: ParsedPage; postedSha256: string } | { ok: false; reason: string } {
  const parsed: z.ZodSafeParseResult<ParsedPage> =
    posted.error != null
      ? FailedPageSchema.transform((page) => ({ kind: "failed" as const, page })).safeParse(posted)
      : ReadPageSchema.transform((page) => ({ kind: "read" as const, page })).safeParse(posted);
  if (!parsed.success) {
    return { ok: false, reason: zodIssueReason(parsed.error) };
  }
  return { ok: true, parsed: parsed.data, postedSha256: canonicalSha256(parsed.data) };
}

export function zodIssueReason(error: z.ZodError) {
  const [issue] = error.issues;
  const path = issue?.path.join(".");
  return path ? `${path}: ${issue?.message}` : `${issue?.message}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

// What was read decides whether a post repeats a page; which image it came from doesn't.
function canonicalSha256(parsed: ParsedPage) {
  const content = parsed.kind === "read" ? { ...parsed.page, imageSha256: undefined } : parsed.page;
  return createHash("sha256").update(canonicalJson(content)).digest("hex");
}

export const READ_STATUS_OF_WIRE: Record<WireReadStatus, SurveyAnswerReadStatus> = {
  ok: SurveyAnswerReadStatus.OK,
  uncertain: SurveyAnswerReadStatus.UNCERTAIN,
  blank: SurveyAnswerReadStatus.BLANK,
  no_prediction: SurveyAnswerReadStatus.NO_PREDICTION,
};

export function wireValueError(
  kind: SurveyFieldKind,
  value: NonNullable<FieldRead["value"]>,
): string | undefined {
  switch (kind) {
    case SurveyFieldKind.SINGLE_CHOICE:
      return typeof value === "string" ? undefined : "a single choice is one option code";
    case SurveyFieldKind.MULTIPLE_CHOICE:
      if (!Array.isArray(value)) return "a multiple choice is a list of option codes";
      return new Set(value).size === value.length ? undefined : "an option code is repeated";
    case SurveyFieldKind.DIGITS:
      return typeof value === "string" && /^[0-9]+$/.test(value)
        ? undefined
        : "digits are a string of 0-9";
    case SurveyFieldKind.DATE:
      return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? undefined
        : "a date is YYYY-MM-DD";
    case SurveyFieldKind.TEXT:
      return typeof value === "string" ? undefined : "text is a string";
    case SurveyFieldKind.SIGNATURE:
      return value === true ? undefined : "a signature is true";
  }
}
