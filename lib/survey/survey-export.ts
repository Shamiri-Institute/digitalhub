import { and, asc, eq, ne } from "drizzle-orm";

import { db, type Transaction } from "#/db/client";
import { SurveyAuditActor, SurveyQuestionnaireStatus } from "#/db/enums";
import {
  hub,
  type JsonValue,
  school,
  surveyAnswer,
  surveyQuestionnaire,
  surveyVersion,
} from "#/db/schema";
import type { AdminScope } from "#/lib/auth/admin-access";
import { type FieldQuestion, fieldQuestionsOf } from "#/lib/survey/answer-fields";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import type { SurveyForm } from "#/lib/survey/form";

export const SURVEY_EXPORT_FILES = ["answers", "codebook"] as const;
export type SurveyExportFile = (typeof SURVEY_EXPORT_FILES)[number];

export function isSurveyExportFile(file: string): file is SurveyExportFile {
  return (SURVEY_EXPORT_FILES as readonly string[]).includes(file);
}

/** Between the codes of a multiple-choice answer, in one cell. */
export const MULTIPLE_CODES_SEPARATOR = ";";

const COPY_COLUMNS = ["serial", "hub", "school", "student_id", "version", "status"];
const CODEBOOK_COLUMNS = ["version", "field", "kind", "required", "prompt", "row", "code", "label"];

/**
 * One of a survey's export files, read in one snapshot, and its download recorded in the audit log.
 * Null for a survey outside the Research admin's implementer and project.
 */
export async function exportSurvey(scope: AdminScope, surveyId: string, file: SurveyExportFile) {
  return db.transaction(
    async (tx) => {
      const found = await tx.query.survey.findFirst({
        where: (s, { and, eq }) =>
          and(
            eq(s.id, surveyId),
            eq(s.implementerId, scope.implementerId),
            eq(s.projectId, scope.projectId),
          ),
        columns: { id: true, code: true },
        with: {
          versions: {
            where: (v, { isNotNull }) => isNotNull(v.publishedAt),
            columns: { id: true, versionNumber: true, form: true },
            orderBy: (v, { asc }) => asc(v.versionNumber),
          },
        },
      });
      if (!found) {
        return null;
      }
      const table =
        file === "answers"
          ? await answersTable(tx, found.id, found.versions)
          : codebookTable(found.versions);
      await recordSurveyEvent(tx, {
        actor: { kind: SurveyAuditActor.USER, userId: scope.userId },
        entityType: SurveyAuditEntity.SURVEY,
        entityId: found.id,
        surveyId: found.id,
        action: SurveyAuditAction.SURVEY_EXPORTED,
        after: { file, rows: table.length - 1 },
      });
      return { fileName: `${found.code}-${file}.csv`, csv: csvOf(table) };
    },
    { isolationLevel: "repeatable read" },
  );
}

type PublishedVersion = { id: string; versionNumber: number; form: SurveyForm };

/** One row per copy that wasn't voided, in serial order, with a column per field of any version. */
async function answersTable(tx: Transaction, surveyId: string, versions: PublishedVersion[]) {
  const fields = [
    ...new Set(versions.flatMap((version) => [...fieldQuestionsOf(version.form).keys()])),
  ];
  const ofSurvey = and(
    eq(surveyQuestionnaire.surveyId, surveyId),
    ne(surveyQuestionnaire.status, SurveyQuestionnaireStatus.VOID),
  );
  const [copies, answers] = await Promise.all([
    tx
      .select({
        id: surveyQuestionnaire.id,
        serial: surveyQuestionnaire.serial,
        hubName: hub.hubName,
        schoolName: school.schoolName,
        studentId: surveyQuestionnaire.studentId,
        versionNumber: surveyVersion.versionNumber,
        status: surveyQuestionnaire.status,
      })
      .from(surveyQuestionnaire)
      .innerJoin(hub, eq(hub.id, surveyQuestionnaire.hubId))
      .innerJoin(school, eq(school.id, surveyQuestionnaire.schoolId))
      .innerJoin(surveyVersion, eq(surveyVersion.id, surveyQuestionnaire.versionId))
      .where(ofSurvey)
      .orderBy(asc(surveyQuestionnaire.serialNumber)),
    tx
      .select({
        questionnaireId: surveyAnswer.questionnaireId,
        field: surveyAnswer.field,
        value: surveyAnswer.value,
      })
      .from(surveyAnswer)
      .innerJoin(surveyQuestionnaire, eq(surveyQuestionnaire.id, surveyAnswer.questionnaireId))
      .where(ofSurvey),
  ]);
  const answersByCopy = new Map<string, Map<string, JsonValue | null>>();
  for (const answer of answers) {
    const copyAnswers =
      answersByCopy.get(answer.questionnaireId) ?? new Map<string, JsonValue | null>();
    copyAnswers.set(answer.field, answer.value);
    answersByCopy.set(answer.questionnaireId, copyAnswers);
  }
  return [
    [...COPY_COLUMNS, ...fields],
    ...copies.map((copy) => {
      const copyAnswers = answersByCopy.get(copy.id);
      return [
        copy.serial,
        copy.hubName,
        copy.schoolName,
        copy.studentId ?? "",
        String(copy.versionNumber),
        copy.status,
        ...fields.map((field) => answerCell(copyAnswers?.get(field) ?? null)),
      ];
    }),
  ];
}

/** An answer as a cell: its option code or codes, its digits, date or text, or 1 for signed. */
export function answerCell(value: JsonValue | null): string {
  if (value === null) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map(String).join(MULTIPLE_CODES_SEPARATOR);
  }
  if (value === true) {
    return "1";
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

/** One row per field of each version, and per option of a choice field. */
function codebookTable(versions: PublishedVersion[]) {
  return [
    CODEBOOK_COLUMNS,
    ...versions.flatMap((version) =>
      [...fieldQuestionsOf(version.form).values()].flatMap((question) => {
        const described = [
          String(version.versionNumber),
          question.field,
          codebookKind(question),
          question.required ? "yes" : "no",
          question.prompt,
          question.rowLabel ?? "",
        ];
        return question.input.kind === "choice"
          ? question.input.options.map((option) => [...described, option.code, option.label])
          : [[...described, "", ""]];
      }),
    ),
  ];
}

function codebookKind({ input, rowLabel }: FieldQuestion) {
  switch (input.kind) {
    case "choice":
      if (input.multiple) return "multiple_choice";
      return rowLabel === undefined ? "single_choice" : "grid_row";
    case "digits":
      return "number";
    default:
      return input.kind;
  }
}

/** RFC 4180, with CRLF line ends. */
export function csvOf(table: readonly (readonly string[])[]) {
  return `${table.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

// A spreadsheet runs a cell that starts with one of these as a formula, so a typed answer could
// run one on a researcher's machine.
const FORMULA_START = /^[=+\-@\t\r]/;

function csvCell(text: string) {
  const inert = FORMULA_START.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(inert) ? `"${inert.replaceAll('"', '""')}"` : inert;
}
