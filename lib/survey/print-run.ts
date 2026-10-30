// Recording print runs, issuing their copies and voiding them, shared by the print-run actions, the
// print job, the seed and tests so they can't drift apart. Every rule a request must meet is checked
// here; the triggers in drizzle/0042_survey_print_run_guards.sql and
// drizzle/0044_survey_print_file_guards.sql back up the ones about hubs, schools, students and pages.

import { createHash } from "node:crypto";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
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
  surveyPrintFile,
  surveyPrintRun,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyVersion,
} from "#/db/schema";
import type { HubSurveyScope, PrintRunViewer } from "#/lib/auth/survey-access";
import { NotFoundError } from "#/lib/auth/require-auth-role";
import { objectId } from "#/lib/crypto";
import { recordSurveyEvent, SurveyAuditAction, SurveyAuditEntity } from "#/lib/survey/audit";
import { type PrintRunRequest, printRunRequestKey } from "#/lib/survey/print-run-request";
import {
  formatSerial,
  MAX_COPIES_PER_FILE,
  MAX_COPIES_PER_RUN,
  MAX_PAGES_PER_FILE,
  pageCode,
  serialRangeOf,
} from "#/lib/survey/serial";

const MAX_BIND_PARAMS = 65_535;

type PrintRunInput = { printRunId: string; versionId: string; request: PrintRunRequest };

export type RecordedPrintRun = {
  printRunId: string;
  copyCount: number;
  firstSerial: string;
  lastSerial: string;
};

/**
 * The students a run prints for: not archived, and not dropped out. Raw SQL over "students"
 * because the print form counts them inside relational `extras`, where drizzle rewrites column
 * references to the parent's alias.
 */
export function activeStudent() {
  return sql.raw(`"students"."archived_at" is null and "students"."dropped_out" is not true`);
}

/**
 * The schools a run prints for: not archived, and not dropped out of the programme. Takes the
 * table a relational `where` callback is given, so the print form and recordPrintRun share it.
 */
export function activeSchool(schools: Pick<typeof school, "archivedAt" | "droppedOut"> = school) {
  return sql`${schools.archivedAt} is null and ${schools.droppedOut} is not true`;
}

/** Stored on the run, so a resubmitted print run id can be matched against what it first asked for. */
export function printRunRequestDigest(request: PrintRunRequest) {
  return createHash("sha256").update(printRunRequestKey(request)).digest("hex");
}

export function studentPrintOrder() {
  return [asc(student.studentName), asc(student.id)];
}

/** A refused request whose message is safe to show; the action reports it as is. */
export class PrintRunError extends Error {}

type PlannedCopy = { schoolId: string; studentId: string | null };

/**
 * Records a print run in `tx`: the run, its serials reserved, its file plan and one audit event.
 * The version must be a published version of an active survey in the scope, the request kind must
 * match its prefill, the schools must be active schools of the scope's hub, and the total 1 to
 * MAX_COPIES_PER_RUN. A refused request throws PrintRunError or NotFoundError before anything is
 * written. It inserts no copies: the print job issues them a file at a time (`issuePrintFile`), so
 * the survey row it locks to reserve serials is held only for this short transaction. A second call
 * with the same `printRunId` fails on `survey_print_runs_pkey`, and its rollback returns the
 * serials it reserved.
 */
export async function recordPrintRun(
  tx: Transaction,
  scope: HubSurveyScope,
  input: PrintRunInput,
): Promise<RecordedPrintRun> {
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
    .where(and(inArray(school.id, schoolIds), eq(school.hubId, scope.hubId), activeSchool()));
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
      .where(and(inArray(student.schoolId, schoolIds), activeStudent()))
      .orderBy(asc(student.schoolId), ...studentPrintOrder());
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
    copies = planCopies(input.request, activeStudentsBySchool);
  }
  if (copies.length < 1) {
    throw new PrintRunError("Nothing to print: the chosen schools have no active students");
  }
  if (copies.length > MAX_COPIES_PER_RUN) {
    throw new PrintRunError(`A print run has at most ${MAX_COPIES_PER_RUN} copies`);
  }

  // Locks the survey row until commit, so a concurrent run of the same survey waits here and then
  // takes the next block.
  const [reserved] = await tx
    .update(survey)
    .set({ nextSerial: sql`${survey.nextSerial} + ${copies.length}` })
    .where(eq(survey.id, version.surveyId))
    .returning({ nextSerial: survey.nextSerial });
  if (!reserved) {
    throw new Error(`Survey ${version.surveyId} disappeared while recording a print run`);
  }
  const firstNumber = reserved.nextSerial - copies.length;
  await tx.insert(surveyPrintRun).values({
    id: input.printRunId,
    versionId: version.id,
    hubId: scope.hubId,
    requestedBy: scope.userId,
    copyCount: copies.length,
    firstSerialNumber: firstNumber,
    requestDigest: printRunRequestDigest(input.request),
  });
  // One statement: the plan trigger checks that a run's files number its copies exactly once.
  const files = planPrintFiles(copies, firstNumber, pageCount);
  await tx
    .insert(surveyPrintFile)
    .values(files.map((file) => ({ ...file, printRunId: input.printRunId })));

  const recorded = {
    printRunId: input.printRunId,
    copyCount: copies.length,
    ...serialRangeOf(version.surveyCode, {
      firstSerialNumber: firstNumber,
      copyCount: copies.length,
    }),
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
      copyCount: recorded.copyCount,
      firstSerial: recorded.firstSerial,
      lastSerial: recorded.lastSerial,
      fileCount: files.length,
      schools: [...copiesPerSchool].map(([schoolId, copyCount]) => ({ schoolId, copyCount })),
    },
  });
  return recorded;
}

export type PrintFilePlan = {
  schoolId: string;
  partNumber: number;
  firstSerialNumber: number;
  copyCount: number;
  studentIds: string[] | null;
};

/**
 * The files a run prints as: each school's copies, in order, split into as few near-equal parts as
 * MAX_COPIES_PER_FILE and MAX_PAGES_PER_FILE allow, numbered on from `firstSerialNumber`. A
 * school's copies are next to each other in `copies`, as `planCopies` makes them.
 */
export function planPrintFiles(
  copies: readonly PlannedCopy[],
  firstSerialNumber: number,
  pageCount: number,
): PrintFilePlan[] {
  const perFile = Math.max(
    1,
    Math.min(MAX_COPIES_PER_FILE, Math.floor(MAX_PAGES_PER_FILE / pageCount)),
  );
  const schools: { schoolId: string; copies: PlannedCopy[] }[] = [];
  for (const copy of copies) {
    const current = schools.at(-1);
    if (current?.schoolId === copy.schoolId) {
      current.copies.push(copy);
    } else {
      schools.push({ schoolId: copy.schoolId, copies: [copy] });
    }
  }
  const files: PrintFilePlan[] = [];
  let nextSerialNumber = firstSerialNumber;
  for (const { schoolId, copies: atSchool } of schools) {
    const parts = Math.ceil(atSchool.length / perFile);
    let start = 0;
    for (let part = 0; part < parts; part++) {
      const size = Math.floor(atSchool.length / parts) + (part < atSchool.length % parts ? 1 : 0);
      const studentIds = atSchool
        .slice(start, start + size)
        .flatMap(({ studentId }) => (studentId === null ? [] : [studentId]));
      files.push({
        schoolId,
        partNumber: part + 1,
        firstSerialNumber: nextSerialNumber,
        copyCount: size,
        studentIds: studentIds.length > 0 ? studentIds : null,
      });
      start += size;
      nextSerialNumber += size;
    }
  }
  return files;
}

/**
 * Inserts one print file's copies and their pages, as its plan lists them, once: a file whose
 * copies are already issued is left as it is. Locks only the file's row, so it never waits on the
 * survey or on other files.
 */
export async function issuePrintFile(
  tx: Transaction,
  fileId: string,
): Promise<"issued" | "already-issued"> {
  const [file] = await tx
    .select({
      id: surveyPrintFile.id,
      printRunId: surveyPrintFile.printRunId,
      schoolId: surveyPrintFile.schoolId,
      firstSerialNumber: surveyPrintFile.firstSerialNumber,
      copyCount: surveyPrintFile.copyCount,
      studentIds: surveyPrintFile.studentIds,
      issuedAt: surveyPrintFile.issuedAt,
      versionId: surveyPrintRun.versionId,
      hubId: surveyPrintRun.hubId,
      surveyId: surveyVersion.surveyId,
      surveyCode: survey.code,
      pageCount: sql<number>`jsonb_array_length(${surveyVersion.layout} -> 'pages')`.mapWith(
        Number,
      ),
    })
    .from(surveyPrintFile)
    .innerJoin(surveyPrintRun, eq(surveyPrintRun.id, surveyPrintFile.printRunId))
    .innerJoin(surveyVersion, eq(surveyVersion.id, surveyPrintRun.versionId))
    .innerJoin(survey, eq(survey.id, surveyVersion.surveyId))
    .where(eq(surveyPrintFile.id, fileId))
    .for("update", { of: surveyPrintFile });
  if (!file) {
    throw new NotFoundError("Print file");
  }
  if (file.issuedAt) {
    return "already-issued";
  }

  const copies = Array.from({ length: file.copyCount }, (_, index) => {
    const serialNumber = file.firstSerialNumber + index;
    return {
      id: objectId("surveyquestionnaire"),
      surveyId: file.surveyId,
      versionId: file.versionId,
      printRunId: file.printRunId,
      serial: formatSerial(file.surveyCode, serialNumber),
      serialNumber,
      hubId: file.hubId,
      schoolId: file.schoolId,
      studentId: file.studentIds?.[index] ?? null,
    };
  });
  await insertInChunks(tx, surveyQuestionnaire, copies);
  await insertInChunks(
    tx,
    surveyQuestionnairePage,
    copies.flatMap((questionnaire) =>
      Array.from({ length: file.pageCount }, (_, index) => ({
        id: objectId("surveyquestionnairepage"),
        questionnaireId: questionnaire.id,
        pageNumber: index + 1,
        code: pageCode(questionnaire.serial, index + 1),
      })),
    ),
  );
  const [issued] = await tx
    .update(surveyPrintFile)
    .set({ issuedAt: new Date() })
    .where(eq(surveyPrintFile.id, file.id))
    .returning({ id: surveyPrintFile.id });
  if (!issued) {
    throw new Error(`Print file ${file.id} disappeared while locked`);
  }
  return "issued";
}

/**
 * The copies a request asks for, in print order: schools in the order given, and each school's
 * students in the order of `activeStudentsBySchool`. The caller has checked every school is in
 * scope. An excluded id that is no longer an active student of the school has nothing to exclude.
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
  return request.schools.flatMap(({ schoolId, excludedStudentIds }) => {
    const excluded = new Set(excludedStudentIds);
    return (activeStudentsBySchool.get(schoolId) ?? [])
      .filter((studentId) => !excluded.has(studentId))
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
