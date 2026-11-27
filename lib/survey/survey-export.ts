import { and, asc, count, eq, inArray, isNotNull, ne } from "drizzle-orm";

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
import {
  type ExportCellValues,
  EXPORTED_COPY_STATUSES,
  MULTIPLE_CODES_SEPARATOR,
  NOT_ASKED,
  type SurveyExportFile,
  type SurveyExportOptions,
} from "#/lib/survey/export-options";
import type { SurveyForm } from "#/lib/survey/form";

const COPY_COLUMNS = ["serial", "hub", "school", "student_id", "version", "status"];
const CODEBOOK_COLUMNS = ["version", "field", "kind", "required", "prompt", "row", "code", "label"];

/**
 * What the export dialog offers: each published version, newest first, with its answer fields and
 * its copies counted by school and status, so the dialog can say what each choice would export.
 */
export async function fetchExportChoices(scope: AdminScope, surveyId: string) {
  const found = await db.query.survey.findFirst({
    where: (s, { and, eq }) =>
      and(
        eq(s.id, surveyId),
        eq(s.implementerId, scope.implementerId),
        eq(s.projectId, scope.projectId),
      ),
    columns: { id: true },
    with: {
      versions: {
        where: (v, { isNotNull }) => isNotNull(v.publishedAt),
        columns: { id: true, versionNumber: true, form: true },
        orderBy: (v, { desc }) => desc(v.versionNumber),
      },
    },
  });
  if (!found) {
    return [];
  }
  const copyCounts = await db
    .select({
      versionId: surveyQuestionnaire.versionId,
      schoolId: surveyQuestionnaire.schoolId,
      status: surveyQuestionnaire.status,
      copies: count(),
    })
    .from(surveyQuestionnaire)
    .where(
      and(
        eq(surveyQuestionnaire.surveyId, found.id),
        ne(surveyQuestionnaire.status, SurveyQuestionnaireStatus.VOID),
      ),
    )
    .groupBy(
      surveyQuestionnaire.versionId,
      surveyQuestionnaire.schoolId,
      surveyQuestionnaire.status,
    );
  return found.versions.map((version) => ({
    versionNumber: version.versionNumber,
    fields: [...fieldQuestionsOf(version.form).keys()],
    copyCounts: copyCounts
      .filter((counted) => counted.versionId === version.id)
      .map(({ schoolId, status, copies }) => ({ schoolId, status, copies })),
  }));
}

export type ExportChoices = Awaited<ReturnType<typeof fetchExportChoices>>;

/**
 * One of a survey's export files, read in one snapshot, and its download recorded in the audit log.
 * Null for a survey outside the Research admin's implementer and project, or a version it hasn't
 * published.
 */
export async function exportSurvey(
  scope: AdminScope,
  surveyId: string,
  file: SurveyExportFile,
  options: SurveyExportOptions,
) {
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
            where: (v, { and, inArray, isNotNull }) =>
              and(isNotNull(v.publishedAt), inArray(v.versionNumber, options.versions)),
            columns: { id: true, versionNumber: true, form: true },
            orderBy: (v, { desc }) => desc(v.versionNumber),
          },
        },
      });
      if (!found || found.versions.length !== options.versions.length) {
        return null;
      }
      const table =
        file === "answers"
          ? await answersTable(tx, found.versions, options)
          : codebookTable(found.versions.toReversed());
      await recordSurveyEvent(tx, {
        actor: { kind: SurveyAuditActor.USER, userId: scope.userId },
        entityType: SurveyAuditEntity.SURVEY,
        entityId: found.id,
        surveyId: found.id,
        action: SurveyAuditAction.SURVEY_EXPORTED,
        after: { file, rows: table.length - 1, ...options },
      });
      return { fileName: `${found.code}-${file}.csv`, csv: csvOf(table) };
    },
    { isolationLevel: "repeatable read" },
  );
}

type PublishedVersion = { id: string; versionNumber: number; form: SurveyForm };

/**
 * One row per chosen copy, in serial order. The columns are the newest version's fields in its
 * order, then the fields only older versions asked.
 */
async function answersTable(
  tx: Transaction,
  newestFirst: PublishedVersion[],
  { values, copies: exportedCopies }: SurveyExportOptions,
) {
  const questionsByVersion = new Map(
    newestFirst.map((version) => [version.id, fieldQuestionsOf(version.form)]),
  );
  const fields = [
    ...new Set([...questionsByVersion.values()].flatMap((questions) => [...questions.keys()])),
  ];
  const chosenCopies = and(
    inArray(
      surveyQuestionnaire.versionId,
      newestFirst.map((version) => version.id),
    ),
    inArray(surveyQuestionnaire.status, EXPORTED_COPY_STATUSES[exportedCopies]),
  );
  const [copies, answers] = await Promise.all([
    tx
      .select({
        id: surveyQuestionnaire.id,
        serial: surveyQuestionnaire.serial,
        hubName: hub.hubName,
        schoolName: school.schoolName,
        studentId: surveyQuestionnaire.studentId,
        versionId: surveyQuestionnaire.versionId,
        versionNumber: surveyVersion.versionNumber,
        status: surveyQuestionnaire.status,
      })
      .from(surveyQuestionnaire)
      .innerJoin(hub, eq(hub.id, surveyQuestionnaire.hubId))
      .innerJoin(school, eq(school.id, surveyQuestionnaire.schoolId))
      .innerJoin(surveyVersion, eq(surveyVersion.id, surveyQuestionnaire.versionId))
      .where(chosenCopies)
      .orderBy(asc(surveyQuestionnaire.serialNumber)),
    tx
      .select({
        questionnaireId: surveyAnswer.questionnaireId,
        field: surveyAnswer.field,
        value: surveyAnswer.value,
      })
      .from(surveyAnswer)
      .innerJoin(surveyQuestionnaire, eq(surveyQuestionnaire.id, surveyAnswer.questionnaireId))
      .where(and(chosenCopies, isNotNull(surveyAnswer.value))),
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
      const questions = questionsByVersion.get(copy.versionId);
      return [
        copy.serial,
        copy.hubName,
        copy.schoolName,
        copy.studentId ?? "",
        String(copy.versionNumber),
        copy.status,
        ...fields.map((field) =>
          answerCell(questions?.get(field), copyAnswers?.get(field) ?? null, values),
        ),
      ];
    }),
  ];
}

/**
 * An answer as a cell: option codes, their labels, or both, and digits, a date or text as written.
 * A question the copy's version didn't print is NOT_ASKED; one left blank is empty.
 */
export function answerCell(
  question: FieldQuestion | undefined,
  value: JsonValue | null,
  values: ExportCellValues,
): string {
  if (!question) {
    return NOT_ASKED;
  }
  if (value === null) {
    return "";
  }
  const { input } = question;
  if (input.kind === "choice") {
    const codes = Array.isArray(value) ? value : [value];
    return codes
      .map((code) => (typeof code === "string" ? code : JSON.stringify(code)))
      .map((code) =>
        cellOf(code, input.options.find((option) => option.code === code)?.label, values),
      )
      .join(MULTIPLE_CODES_SEPARATOR);
  }
  if (input.kind === "signature" && value === true) {
    return cellOf("1", "Signed", values);
  }
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function cellOf(code: string, label: string | undefined, values: ExportCellValues) {
  if (values === "codes" || label === undefined) {
    return code;
  }
  return values === "text" ? label : `${code}: ${label}`;
}

/** One row per field of each version, and per option of a choice field. */
function codebookTable(oldestFirst: PublishedVersion[]) {
  return [
    CODEBOOK_COLUMNS,
    ...oldestFirst.flatMap((version) =>
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
