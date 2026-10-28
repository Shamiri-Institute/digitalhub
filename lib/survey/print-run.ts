// Issuing and voiding printed copies, shared by the print-run actions, the seed and tests so they
// can't drift apart. Every rule a request must meet is checked here; the triggers in
// drizzle/0039_survey_print_run_guards.sql back up the ones about hubs, schools, students and pages.

import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { PgInsertValue, PgTable } from "drizzle-orm/pg-core";

import type { Transaction } from "#/db/client";
import {
  SURVEY_VERSION_PREFILL_LABELS,
  SurveyAuditActor,
  SurveyQuestionnaireStatus,
  SurveyStatus,
  SurveyVersionPrefill,
  SurveyVersionStatus,
} from "#/db/enums";
import {
  school,
  student,
  survey,
  surveyPrintRun,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyVersion,
} from "#/db/schema";
import type { HubSurveyScope, PrintRunViewer } from "#/lib/auth/survey-access";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { objectId } from "#/lib/crypto";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { formatSerial, MAX_COPIES_PER_RUN, pageCode } from "#/lib/survey/serial";

// Postgres takes at most this many bind parameters in one statement.
const MAX_BIND_PARAMS = 65_535;
// Copies are written a block at a time, with their pages, so a run's million page rows are never
// in memory at once.
const COPIES_PER_BLOCK = 4_000;

/** What to print, by the version's prefill: a number of copies per school, or one per student. */
export type PrintRunRequest =
  | { kind: "COUNTS"; schools: { schoolId: string; copies: number }[] }
  // `studentIds: null` prints every active student of the school.
  | { kind: "STUDENTS"; schools: { schoolId: string; studentIds: string[] | null }[] };

type PrintRunInput = { printRunId: string; versionId: string; request: PrintRunRequest };

export type IssuedPrintRun = {
  printRunId: string;
  copyCount: number;
  firstSerial: string;
  lastSerial: string;
};

/** The students a run prints for: not archived, and not dropped out. */
export function isActiveStudent() {
  return and(
    isNull(student.archivedAt),
    or(eq(student.droppedOut, false), isNull(student.droppedOut)),
  );
}

/** A refused request whose message is safe to show; the action reports it as is. */
export class PrintRunError extends Error {}

type PlannedCopy = { schoolId: string; studentId: string | null };

/**
 * Issues a print run in `tx`: the run (QUEUED), its copies with fresh serials, their pages, and one
 * audit event. The version must be a published version of an active survey in the scope, the
 * request kind must match its prefill, the schools must be active schools of the scope's hub, the
 * students active students of their school, and the total 1 to MAX_COPIES_PER_RUN. A refused
 * request throws PrintRunError or NotFoundError before anything is written. A second call with the
 * same `printRunId` fails on `survey_print_runs_pkey` before it reserves any serials.
 */
export async function issuePrintRun(
  tx: Transaction,
  scope: HubSurveyScope,
  input: PrintRunInput,
): Promise<IssuedPrintRun> {
  // Share-locked so the version can't be retired before this run commits.
  const [version] = await tx
    .select({
      id: surveyVersion.id,
      surveyId: surveyVersion.surveyId,
      versionNumber: surveyVersion.versionNumber,
      status: surveyVersion.status,
      prefill: surveyVersion.prefill,
      layout: surveyVersion.layout,
      surveyCode: survey.code,
      surveyStatus: survey.status,
    })
    .from(surveyVersion)
    .innerJoin(survey, eq(survey.id, surveyVersion.surveyId))
    .where(
      and(
        eq(surveyVersion.id, input.versionId),
        eq(survey.implementerId, scope.implementerId),
        eq(survey.projectId, scope.projectId),
      ),
    )
    .for("share", { of: surveyVersion });
  if (!version) {
    throw new NotFoundError("Survey");
  }
  if (
    version.status !== SurveyVersionStatus.PUBLISHED ||
    !version.layout ||
    !version.prefill ||
    version.surveyStatus !== SurveyStatus.ACTIVE
  ) {
    throw new PrintRunError(`v${version.versionNumber} can't be printed`);
  }
  const printsStudents = version.prefill === SurveyVersionPrefill.STUDENT;
  if ((input.request.kind === "STUDENTS") !== printsStudents) {
    throw new PrintRunError(
      printsStudents
        ? `v${version.versionNumber} prints one copy per student`
        : `v${version.versionNumber} prints ${SURVEY_VERSION_PREFILL_LABELS[version.prefill].toLowerCase()}, so choose a number of copies per school`,
    );
  }
  const pageCount = version.layout.pages.length;

  const schoolIds = input.request.schools.map((s) => s.schoolId);
  if (schoolIds.length === 0) {
    throw new PrintRunError("Choose at least one school");
  }
  if (new Set(schoolIds).size !== schoolIds.length) {
    throw new PrintRunError("Each school can be chosen once");
  }
  const schoolsInHub = await tx
    .select({ id: school.id })
    .from(school)
    .where(
      and(inArray(school.id, schoolIds), eq(school.hubId, scope.hubId), isNull(school.archivedAt)),
    );
  if (schoolsInHub.length !== schoolIds.length) {
    throw new NotFoundError("School");
  }

  let copies: PlannedCopy[];
  if (input.request.kind === "COUNTS") {
    const counts = input.request.schools.map((s) => s.copies);
    if (counts.some((count) => !Number.isInteger(count) || count < 1)) {
      throw new PrintRunError("Print at least one copy for each school");
    }
    // Checked before planning, so a huge request is refused without building its copies.
    if (counts.reduce((sum, count) => sum + count, 0) > MAX_COPIES_PER_RUN) {
      throw new PrintRunError(`A print run has at most ${MAX_COPIES_PER_RUN} copies`);
    }
    copies = planCopies(input.request, new Map());
  } else {
    const activeStudents = await tx
      .select({ id: student.id, schoolId: student.schoolId })
      .from(student)
      .where(and(inArray(student.schoolId, schoolIds), isActiveStudent()))
      .orderBy(asc(student.schoolId), asc(student.studentName), asc(student.id));
    const activeStudentsBySchool = new Map<string, string[]>();
    for (const { id, schoolId } of activeStudents) {
      if (!schoolId) continue;
      const atSchool = activeStudentsBySchool.get(schoolId);
      if (atSchool) {
        atSchool.push(id);
      } else {
        activeStudentsBySchool.set(schoolId, [id]);
      }
    }
    for (const { schoolId, studentIds } of input.request.schools) {
      const activeAtSchool = new Set(activeStudentsBySchool.get(schoolId));
      if (studentIds?.some((id) => !activeAtSchool.has(id))) {
        throw new NotFoundError("Student");
      }
    }
    copies = planCopies(input.request, activeStudentsBySchool);
  }
  if (copies.length < 1) {
    throw new PrintRunError("Nothing to print: the chosen schools have no active students");
  }
  if (copies.length > MAX_COPIES_PER_RUN) {
    throw new PrintRunError(`A print run has at most ${MAX_COPIES_PER_RUN} copies`);
  }

  // The run goes in before the serials are reserved, so a resubmitted form fails here on the
  // primary key without taking the survey's lock or any serials.
  await tx.insert(surveyPrintRun).values({
    id: input.printRunId,
    versionId: version.id,
    hubId: scope.hubId,
    requestedBy: scope.userId,
    copyCount: copies.length,
  });

  // Locks the survey row until commit, so a concurrent run of the same survey waits here and then
  // takes the next block.
  const [reserved] = await tx
    .update(survey)
    .set({ nextSerial: sql`${survey.nextSerial} + ${copies.length}` })
    .where(eq(survey.id, version.surveyId))
    .returning({ nextSerial: survey.nextSerial });
  if (!reserved) {
    throw new Error(`Survey ${version.surveyId} disappeared while issuing a print run`);
  }
  const firstNumber = reserved.nextSerial - copies.length;
  const serialAt = (index: number) => formatSerial(version.surveyCode, firstNumber + index);

  /* oxlint-disable eslint/no-await-in-loop -- one transaction runs one statement at a time */
  for (let start = 0; start < copies.length; start += COPIES_PER_BLOCK) {
    const block = copies.slice(start, start + COPIES_PER_BLOCK).map((copy, offset) => ({
      id: objectId("surveyquestionnaire"),
      surveyId: version.surveyId,
      versionId: version.id,
      printRunId: input.printRunId,
      serial: serialAt(start + offset),
      hubId: scope.hubId,
      schoolId: copy.schoolId,
      studentId: copy.studentId,
    }));
    await insertInChunks(tx, surveyQuestionnaire, block);
    await insertInChunks(
      tx,
      surveyQuestionnairePage,
      block.flatMap((questionnaire) =>
        Array.from({ length: pageCount }, (_, index) => ({
          id: objectId("surveyquestionnairepage"),
          questionnaireId: questionnaire.id,
          pageNumber: index + 1,
          code: pageCode(questionnaire.serial, index + 1),
        })),
      ),
    );
  }
  /* oxlint-enable eslint/no-await-in-loop */

  const issued = {
    printRunId: input.printRunId,
    copyCount: copies.length,
    firstSerial: serialAt(0),
    lastSerial: serialAt(copies.length - 1),
  };
  const copiesPerSchool = new Map<string, number>();
  for (const { schoolId } of copies) {
    copiesPerSchool.set(schoolId, (copiesPerSchool.get(schoolId) ?? 0) + 1);
  }
  await recordSurveyEvent(tx, {
    actor: { kind: SurveyAuditActor.USER, userId: scope.userId },
    surveyId: version.surveyId,
    entityType: SurveyAuditEntity.PRINT_RUN,
    entityId: input.printRunId,
    action: SurveyAuditAction.PRINT_RUN_CREATED,
    after: {
      versionNumber: version.versionNumber,
      hubId: scope.hubId,
      copyCount: issued.copyCount,
      firstSerial: issued.firstSerial,
      lastSerial: issued.lastSerial,
      schools: [...copiesPerSchool].map(([schoolId, copyCount]) => ({ schoolId, copyCount })),
    },
  });
  return issued;
}

/**
 * The copies a request asks for, in print order: schools in the order given, and each school's
 * students in the order of `activeStudentsBySchool`. The caller has checked every school and
 * student is in scope.
 */
function planCopies(
  request: PrintRunRequest,
  activeStudentsBySchool: ReadonlyMap<string, readonly string[]>,
): PlannedCopy[] {
  if (request.kind === "COUNTS") {
    return request.schools.flatMap(({ schoolId, copies }) =>
      Array.from({ length: copies }, () => ({ schoolId, studentId: null })),
    );
  }
  return request.schools.flatMap(({ schoolId, studentIds }) => {
    const activeAtSchool = activeStudentsBySchool.get(schoolId) ?? [];
    // Filtering the ordered list keeps the print order and drops repeated ids.
    const chosen = studentIds ? new Set(studentIds) : undefined;
    return activeAtSchool
      .filter((studentId) => !chosen || chosen.has(studentId))
      .map((studentId) => ({ schoolId, studentId }));
  });
}

/**
 * Inserts rows in as few statements as Postgres allows. The chunk size comes from the parameters
 * drizzle binds for one row, so a column added to the table later can't push a statement past the
 * limit.
 */
async function insertInChunks<T extends PgTable>(
  tx: Transaction,
  table: T,
  rows: PgInsertValue<T>[],
) {
  const [first] = rows;
  if (!first) {
    return;
  }
  const paramsPerRow = tx.insert(table).values(first).toSQL().params.length;
  const rowsPerStatement = Math.floor(MAX_BIND_PARAMS / paramsPerRow);
  /* oxlint-disable eslint/no-await-in-loop -- one transaction runs one statement at a time */
  for (let start = 0; start < rows.length; start += rowsPerStatement) {
    await tx.insert(table).values(rows.slice(start, start + rowsPerStatement));
  }
  /* oxlint-enable eslint/no-await-in-loop */
}

/**
 * Voids a copy the viewer may see, with the reason in the audit history. Voiding a void copy
 * changes nothing, so a resubmitted form is harmless. A copy outside the viewer's scope is
 * "not-found", like a missing one, so ids of other hubs reveal nothing.
 */
export async function voidCopy(
  tx: Transaction,
  viewer: PrintRunViewer,
  { questionnaireId, reason }: { questionnaireId: string; reason: string },
): Promise<"voided" | "already-void" | "not-found"> {
  const [copy] = await tx
    .select({
      id: surveyQuestionnaire.id,
      status: surveyQuestionnaire.status,
      serial: surveyQuestionnaire.serial,
      surveyId: surveyQuestionnaire.surveyId,
    })
    .from(surveyQuestionnaire)
    .innerJoin(survey, eq(survey.id, surveyQuestionnaire.surveyId))
    .where(
      and(
        eq(surveyQuestionnaire.id, questionnaireId),
        viewer.kind === "hub"
          ? eq(surveyQuestionnaire.hubId, viewer.hubId)
          : and(
              eq(survey.implementerId, viewer.implementerId),
              eq(survey.projectId, viewer.projectId),
            ),
      ),
    )
    .for("update", { of: surveyQuestionnaire });
  if (!copy) {
    return "not-found";
  }
  if (copy.status === SurveyQuestionnaireStatus.VOID) {
    return "already-void";
  }

  const [voided] = await tx
    .update(surveyQuestionnaire)
    .set({ status: SurveyQuestionnaireStatus.VOID })
    .where(eq(surveyQuestionnaire.id, copy.id))
    .returning({ id: surveyQuestionnaire.id });
  if (!voided) {
    throw new Error(`Questionnaire ${copy.serial} disappeared while locked`);
  }
  await recordSurveyEvent(tx, {
    actor: { kind: SurveyAuditActor.USER, userId: viewer.userId },
    surveyId: copy.surveyId,
    entityType: SurveyAuditEntity.QUESTIONNAIRE,
    entityId: copy.id,
    action: SurveyAuditAction.QUESTIONNAIRE_VOIDED,
    before: { status: copy.status, serial: copy.serial },
    after: { status: SurveyQuestionnaireStatus.VOID, serial: copy.serial },
    reason,
  });
  return "voided";
}
