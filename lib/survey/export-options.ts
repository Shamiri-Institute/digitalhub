import { z } from "zod";

import { SurveyQuestionnaireStatus } from "#/db/enums";

export const SURVEY_EXPORT_FILES = ["answers", "codebook"] as const;
export type SurveyExportFile = (typeof SURVEY_EXPORT_FILES)[number];

export function isSurveyExportFile(file: string): file is SurveyExportFile {
  return (SURVEY_EXPORT_FILES as readonly string[]).includes(file);
}

/** Between the codes, or labels, of a multiple-choice answer, in one cell. */
export const MULTIPLE_CODES_SEPARATOR = ";";

/** The answers file's columns for each copy, ahead of one column per question key. */
export const COPY_COLUMNS = ["serial", "hub", "school", "student_id", "version", "status"] as const;

export function isCopyColumn(name: string) {
  return (COPY_COLUMNS as readonly string[]).includes(name);
}

/**
 * A field's column in the answers file and the codebook. A version published before such keys were
 * refused may have a question keyed like a copy column, which gets a prefix so no column repeats.
 */
export function fieldColumnOf(field: string) {
  return isCopyColumn(field) ? `answer_${field}` : field;
}

/**
 * Cells that hold no answer yet, each named so none can be read as a question the student left
 * blank, which is empty.
 */
export const EXPORT_MARKERS = {
  /** The copy's version didn't print the question. */
  notAsked: "NOT_ASKED",
  /** The question's page of the copy hasn't been scanned. */
  notScanned: "NOT_SCANNED",
  /** What the pipeline read is waiting for a reviewer, and may be wrong. */
  needsReview: "NEEDS_REVIEW",
} as const;

export const EXPORT_CELL_VALUES = ["codes", "text", "both"] as const;
export type ExportCellValues = (typeof EXPORT_CELL_VALUES)[number];

export const EXPORT_COPIES = ["returned", "verified", "all"] as const;
export type ExportCopies = (typeof EXPORT_COPIES)[number];

/** The copies each choice exports. A voided copy is never exported. */
export const EXPORTED_COPY_STATUSES: Record<ExportCopies, readonly SurveyQuestionnaireStatus[]> = {
  returned: [
    SurveyQuestionnaireStatus.PARTIAL,
    SurveyQuestionnaireStatus.NEEDS_REVIEW,
    SurveyQuestionnaireStatus.READY,
    SurveyQuestionnaireStatus.VERIFIED,
  ],
  verified: [SurveyQuestionnaireStatus.VERIFIED],
  all: [
    SurveyQuestionnaireStatus.ISSUED,
    SurveyQuestionnaireStatus.PARTIAL,
    SurveyQuestionnaireStatus.NEEDS_REVIEW,
    SurveyQuestionnaireStatus.READY,
    SurveyQuestionnaireStatus.VERIFIED,
  ],
};

export const SurveyExportOptionsSchema = z.object({
  versions: z
    .array(z.int().positive())
    .min(1, { error: "Choose at least one version" })
    .transform((versions) => [...new Set(versions)].toSorted((a, b) => a - b)),
  values: z.enum(EXPORT_CELL_VALUES),
  copies: z.enum(EXPORT_COPIES),
});
export type SurveyExportOptions = z.infer<typeof SurveyExportOptionsSchema>;

export function surveyExportPath(
  surveyId: string,
  file: SurveyExportFile,
  { versions, values, copies }: SurveyExportOptions,
) {
  const query = new URLSearchParams({ versions: versions.join(","), values, copies });
  return `/api/surveys/${surveyId}/export/${file}?${query}`;
}

export function surveyExportOptionsOf(query: URLSearchParams): SurveyExportOptions | null {
  const versions = query.get("versions");
  if (versions === null || !/^\d+(,\d+)*$/.test(versions)) {
    return null;
  }
  const parsed = SurveyExportOptionsSchema.safeParse({
    versions: versions.split(",").map(Number),
    values: query.get("values"),
    copies: query.get("copies"),
  });
  return parsed.success ? parsed.data : null;
}
