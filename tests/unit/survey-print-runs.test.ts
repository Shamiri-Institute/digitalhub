// @vitest-environment node
// Issuing print runs against the database: serials, pages, scope and the 0039 triggers. The print
// form is tested through the UI in tests/e2e/hub-coordinator/print-runs.spec.ts; these cover what
// a screen can't reach (concurrent runs, a resubmitted run, a run past the limit) and the writes
// the triggers must refuse, which no screen can attempt.
import { and, asc, eq, inArray, sql, TransactionRollbackError } from "drizzle-orm";
import { DatabaseError } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, isUniqueViolation, pool, type Transaction } from "#/db/client";
import {
  school,
  student,
  survey,
  surveyAuditEvent,
  surveyPrintRun,
  surveyQuestionnaire,
  surveyQuestionnairePage,
  surveyVersion,
} from "#/db/schema";
import { ForbiddenRoleError, NotFoundError } from "#/lib/auth/require-auth-role";
import { type HubSurveyScope, printRunScope } from "#/lib/auth/survey-access";
import { objectId } from "#/lib/crypto";
import {
  issuePrintRun,
  PrintRunError,
  type PrintRunRequest,
  voidCopy,
} from "#/lib/survey/print-run";
import { formatSerial, MAX_COPIES_PER_RUN, pageCode } from "#/lib/survey/serial";
import { createPublishedSurvey, formWithPages } from "#/tests/survey-fixtures";

let scope: HubSurveyScope;
/** A school of the scope's hub made for these tests, with the students below. */
let testSchoolId: string;
let students: Record<"amy" | "ben" | "cat" | "dan", string>;
/** A seeded school of another hub, only read. */
let otherHubSchoolId: string;
let otherHubId: string;
const createdCodes: string[] = [];

beforeAll(async () => {
  const [found] = await db
    .execute<{ hubId: string; implementerId: string; projectId: string }>(
      sql`select h.id as "hubId", h.implementer_id as "implementerId", h.project_id as "projectId"
      from hubs h join projects p on p.id = h.project_id
      where p.is_default and h.archived_at is null
      order by h.id limit 1`,
    )
    .then((result) => result.rows);
  const member = found
    ? await db.query.implementerMember.findFirst({
        where: (m, { and, eq }) =>
          and(eq(m.implementerId, found.implementerId), eq(m.role, "ADMIN")),
        orderBy: (m, { asc }) => asc(m.id),
      })
    : undefined;
  const other = found
    ? await db.query.school.findFirst({
        where: (s, { and, isNotNull, ne }) => and(isNotNull(s.hubId), ne(s.hubId, found.hubId)),
        orderBy: (s, { asc }) => asc(s.id),
      })
    : undefined;
  if (!found || !member || !other?.hubId) throw new Error("Seed the database first");
  scope = { ...found, userId: member.userId };
  otherHubSchoolId = other.id;
  otherHubId = other.hubId;

  testSchoolId = objectId("school");
  await db.insert(school).values({
    id: testSchoolId,
    schoolName: `Print run test school ${testSchoolId}`,
    visibleId: testSchoolId,
    hubId: scope.hubId,
  });
  const studentRow = (name: string, extra: Partial<typeof student.$inferInsert> = {}) => {
    const id = objectId("student");
    return { id, studentName: name, visibleId: id, schoolId: testSchoolId, ...extra };
  };
  // Inserted out of name order, so the print order is visibly the name order.
  const ben = studentRow("Ben Print");
  const amy = studentRow("Amy Print");
  const cat = studentRow("Cat Print", { archivedAt: new Date() });
  const dan = studentRow("Dan Print", { droppedOut: true });
  await db.insert(student).values([ben, amy, cat, dan]);
  students = { amy: amy.id, ben: ben.id, cat: cat.id, dan: dan.id };
});

// The surveys go first, taking their runs, copies and pages with them; copies keep their school
// and students from being deleted. Audit events stay, as history does.
afterAll(async () => {
  if (createdCodes.length > 0) {
    await db.delete(survey).where(inArray(survey.code, createdCodes));
  }
  await db.delete(student).where(eq(student.schoolId, testSchoolId));
  await db.delete(school).where(eq(school.id, testSchoolId));
  await pool.end();
});

function uniqueCode() {
  const code = `R${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  createdCodes.push(code);
  return code;
}

function publish(options: { pages?: number; prefill?: "NONE" | "STUDENT" } = {}) {
  return createPublishedSurvey({
    code: uniqueCode(),
    implementerId: scope.implementerId,
    projectId: scope.projectId,
    createdBy: scope.userId,
    prefill: options.prefill ?? "NONE",
    form: formWithPages(options.pages ?? 2),
  });
}

function issue(
  versionId: string,
  request: PrintRunRequest,
  printRunId = objectId("surveyprintrun"),
) {
  return db.transaction((tx) => issuePrintRun(tx, scope, { printRunId, versionId, request }));
}

function counts(copies: number, schoolId = testSchoolId): PrintRunRequest {
  return { kind: "COUNTS", schools: [{ schoolId, copies }] };
}

async function nextSerialOf(surveyId: string) {
  const found = await db.query.survey.findFirst({
    where: (s, { eq }) => eq(s.id, surveyId),
    columns: { nextSerial: true },
  });
  return found?.nextSerial;
}

async function copiesOf(printRunId: string) {
  return db
    .select({
      serial: surveyQuestionnaire.serial,
      studentId: surveyQuestionnaire.studentId,
      status: surveyQuestionnaire.status,
    })
    .from(surveyQuestionnaire)
    .where(eq(surveyQuestionnaire.printRunId, printRunId))
    .orderBy(asc(surveyQuestionnaire.serial));
}

/** Runs the write in a transaction that is always rolled back; the Postgres error it raised, or null. */
async function errorOf(write: (tx: Transaction) => Promise<unknown>) {
  try {
    await db.transaction(async (tx) => {
      await write(tx);
      tx.rollback();
    });
  } catch (error) {
    if (error instanceof TransactionRollbackError) return null;
    if (error instanceof Error && error.cause instanceof DatabaseError) return error.cause;
    throw error;
  }
  return null;
}

describe("serials and page codes", () => {
  it("formats the printed codes", () => {
    expect(formatSerial("BASE26", 17)).toBe("BASE26-000017");
    expect(formatSerial("BASE26", 1_234_567)).toBe("BASE26-1234567");
    expect(pageCode("BASE26-000017", 3)).toBe("BASE26-000017-P3");
  });

  it("issues numbered copies with one page code per printed page", async () => {
    const published = await publish({ pages: 2 });
    const issued = await issue(published.versionId, counts(3));

    expect(issued).toEqual({
      printRunId: issued.printRunId,
      copyCount: 3,
      firstSerial: `${published.code}-000001`,
      lastSerial: `${published.code}-000003`,
    });
    const pages = await db
      .select({ code: surveyQuestionnairePage.code })
      .from(surveyQuestionnairePage)
      .innerJoin(
        surveyQuestionnaire,
        eq(surveyQuestionnaire.id, surveyQuestionnairePage.questionnaireId),
      )
      .where(eq(surveyQuestionnaire.printRunId, issued.printRunId))
      .orderBy(asc(surveyQuestionnairePage.code));
    expect(pages.map((p) => p.code)).toEqual(
      [1, 2, 3].flatMap((n) => [1, 2].map((p) => `${published.code}-00000${n}-P${p}`)),
    );
    expect(await nextSerialOf(published.id)).toBe(4);
  });

  it("concurrent runs get disjoint serials", async () => {
    const published = await publish();
    const [first, second] = await Promise.all([
      issue(published.versionId, counts(30)),
      issue(published.versionId, counts(40)),
    ]);

    const serials = [
      ...(await copiesOf(first.printRunId)),
      ...(await copiesOf(second.printRunId)),
    ].map((c) => c.serial);
    expect(serials.toSorted()).toEqual(
      Array.from({ length: 70 }, (_, i) => formatSerial(published.code, i + 1)),
    );
    expect(await nextSerialOf(published.id)).toBe(71);
  });

  it("splits a run too large for one statement into several", async () => {
    const published = await publish({ pages: 6 });
    const issued = await issue(published.versionId, counts(4500));

    const [pageCount] = await db
      .select({ value: sql<number>`count(*)::int` })
      .from(surveyQuestionnairePage)
      .innerJoin(
        surveyQuestionnaire,
        eq(surveyQuestionnaire.id, surveyQuestionnairePage.questionnaireId),
      )
      .where(eq(surveyQuestionnaire.printRunId, issued.printRunId));
    expect(issued.copyCount).toBe(4500);
    expect(pageCount?.value).toBe(27_000);
  });

  it(`refuses more than ${MAX_COPIES_PER_RUN} copies before reserving serials`, async () => {
    const published = await publish();
    await expect(issue(published.versionId, counts(MAX_COPIES_PER_RUN + 1))).rejects.toThrow(
      PrintRunError,
    );
    expect(await nextSerialOf(published.id)).toBe(1);
  });

  it("a resubmitted run fails on its id and leaves the first run as it was", async () => {
    const published = await publish();
    const printRunId = objectId("surveyprintrun");
    await issue(published.versionId, counts(5), printRunId);

    const retry = await issue(published.versionId, counts(5), printRunId).catch(
      (error: unknown) => error,
    );
    expect(isUniqueViolation(retry, "survey_print_runs_pkey")).toBe(true);
    expect(await copiesOf(printRunId)).toHaveLength(5);
    expect(await nextSerialOf(published.id)).toBe(6);
  });
});

describe("one copy per student", () => {
  it("prints every active student of a school, in name order", async () => {
    const published = await publish({ prefill: "STUDENT" });
    const issued = await issue(published.versionId, {
      kind: "STUDENTS",
      schools: [{ schoolId: testSchoolId, studentIds: null }],
    });
    expect((await copiesOf(issued.printRunId)).map((c) => c.studentId)).toEqual([
      students.amy,
      students.ben,
    ]);
  });

  it("prints only the chosen students", async () => {
    const published = await publish({ prefill: "STUDENT" });
    const issued = await issue(published.versionId, {
      kind: "STUDENTS",
      schools: [{ schoolId: testSchoolId, studentIds: [students.ben] }],
    });
    expect((await copiesOf(issued.printRunId)).map((c) => c.studentId)).toEqual([students.ben]);
  });

  it("refuses archived, dropped-out and other schools' students", async () => {
    const published = await publish({ prefill: "STUDENT" });
    const seededStudent = await db.query.student.findFirst({
      where: (s, { and, isNotNull, ne }) =>
        and(isNotNull(s.schoolId), ne(s.schoolId, testSchoolId)),
      columns: { id: true },
    });
    if (!seededStudent) throw new Error("Seed the database first");
    for (const studentId of [students.cat, students.dan, seededStudent.id]) {
      await expect(
        issue(published.versionId, {
          kind: "STUDENTS",
          schools: [{ schoolId: testSchoolId, studentIds: [studentId] }],
        }),
      ).rejects.toThrow(NotFoundError);
    }
  });

  it("refuses a request kind that doesn't match the version's prefill", async () => {
    const studentVersion = await publish({ prefill: "STUDENT" });
    await expect(issue(studentVersion.versionId, counts(2))).rejects.toThrow(
      "prints one copy per student",
    );
    const blankVersion = await publish();
    await expect(
      issue(blankVersion.versionId, {
        kind: "STUDENTS",
        schools: [{ schoolId: testSchoolId, studentIds: null }],
      }),
    ).rejects.toThrow(PrintRunError);
  });
});

describe("hub scope", () => {
  it("refuses a hub coordinator naming another hub", async () => {
    await expect(printRunScope({ kind: "hub", ...scope }, otherHubId)).rejects.toThrow(
      ForbiddenRoleError,
    );
    await expect(printRunScope({ kind: "hub", ...scope }, scope.hubId)).resolves.toEqual(scope);
  });

  it("refuses a school of another hub and reserves nothing", async () => {
    const published = await publish();
    const printRunId = objectId("surveyprintrun");
    await expect(
      issue(published.versionId, counts(1, otherHubSchoolId), printRunId),
    ).rejects.toThrow(NotFoundError);
    expect(await nextSerialOf(published.id)).toBe(1);
    expect(
      await db.query.surveyPrintRun.findFirst({ where: (r, { eq }) => eq(r.id, printRunId) }),
    ).toBeUndefined();
  });

  it("lets a coordinator void only their own hub's copies", async () => {
    const published = await publish();
    const issued = await issue(published.versionId, counts(1));
    const [copy] = await db
      .select({ id: surveyQuestionnaire.id })
      .from(surveyQuestionnaire)
      .where(eq(surveyQuestionnaire.printRunId, issued.printRunId));
    if (!copy) throw new Error("No copy");
    const request = { questionnaireId: copy.id, reason: "Torn in transit" };

    const otherCoordinator = { kind: "hub" as const, ...scope, hubId: otherHubId };
    expect(await db.transaction((tx) => voidCopy(tx, otherCoordinator, request))).toBe("not-found");
    const coordinator = { kind: "hub" as const, ...scope };
    expect(await db.transaction((tx) => voidCopy(tx, coordinator, request))).toBe("voided");
    expect(await db.transaction((tx) => voidCopy(tx, coordinator, request))).toBe("already-void");

    const events = await db
      .select({ reason: surveyAuditEvent.reason, actorUserId: surveyAuditEvent.actorUserId })
      .from(surveyAuditEvent)
      .where(
        and(
          eq(surveyAuditEvent.entityId, copy.id),
          eq(surveyAuditEvent.action, "QUESTIONNAIRE_VOIDED"),
        ),
      );
    expect(events).toEqual([{ reason: "Torn in transit", actorUserId: scope.userId }]);
  });
});

describe("print-run triggers", () => {
  /** A one-copy run of a published two-page version, issued inside `tx`. */
  async function oneCopy(tx: Transaction, versionId: string) {
    const issued = await issuePrintRun(tx, scope, {
      printRunId: objectId("surveyprintrun"),
      versionId,
      request: counts(1),
    });
    const [copy] = await tx
      .select()
      .from(surveyQuestionnaire)
      .where(eq(surveyQuestionnaire.printRunId, issued.printRunId));
    if (!copy) throw new Error("No copy");
    return copy;
  }

  it("rejects a page its version does not print", async () => {
    const published = await publish({ pages: 2 });
    const pageError = (pageNumber: number, code?: string) =>
      errorOf(async (tx) => {
        const copy = await oneCopy(tx, published.versionId);
        await tx.insert(surveyQuestionnairePage).values({
          questionnaireId: copy.id,
          pageNumber,
          code: code ?? pageCode(copy.serial, pageNumber),
        });
      });

    expect((await pageError(3))?.constraint).toBe("survey_questionnaire_pages_in_layout");
    expect((await pageError(0))?.constraint).toBe("survey_questionnaire_pages_page_number_check");
    expect((await pageError(2, "WRONG-000001-P1"))?.constraint).toBe(
      "survey_questionnaire_pages_code_check",
    );
  });

  it("rejects a copy whose school is in another hub, or a student on a blank version", async () => {
    const published = await publish();
    const copyError = (values: { schoolId: string; studentId?: string }) =>
      errorOf(async (tx) => {
        const copy = await oneCopy(tx, published.versionId);
        await tx.insert(surveyQuestionnaire).values({
          ...copy,
          id: objectId("surveyquestionnaire"),
          serial: `${published.code}-999999`,
          ...values,
        });
      });

    expect((await copyError({ schoolId: otherHubSchoolId }))?.constraint).toBe(
      "survey_questionnaires_issue_check",
    );
    expect((await copyError({ schoolId: testSchoolId, studentId: students.amy }))?.constraint).toBe(
      "survey_questionnaires_issue_check",
    );
  });

  it("rejects a run for another implementer's hub or of a version that isn't published", async () => {
    const published = await publish();
    const foreignHub = await db.query.hub.findFirst({
      where: (h, { ne }) => ne(h.implementerId, scope.implementerId),
      columns: { id: true },
    });
    if (!foreignHub) throw new Error("The seed has a single implementer");
    const [draft] = await db
      .insert(surveyVersion)
      .values({
        surveyId: published.id,
        versionNumber: 2,
        createdBy: scope.userId,
        form: formWithPages(1),
      })
      .returning({ id: surveyVersion.id });
    if (!draft) throw new Error("No draft");
    const runError = (versionId: string, hubId: string) =>
      errorOf((tx) =>
        tx
          .insert(surveyPrintRun)
          .values({ versionId, hubId, requestedBy: scope.userId, copyCount: 1 }),
      );

    expect((await runError(published.versionId, foreignHub.id))?.constraint).toBe(
      "survey_print_runs_guard",
    );
    expect((await runError(draft.id, scope.hubId))?.constraint).toBe("survey_print_runs_guard");
    expect(await runError(published.versionId, scope.hubId)).toBeNull();
  });

  it("freezes a copy's identity, keeps VOID final, and never changes pages or runs", async () => {
    const published = await publish();
    const frozenError = (write: (tx: Transaction, copyId: string) => Promise<unknown>) =>
      errorOf(async (tx) => {
        const copy = await oneCopy(tx, published.versionId);
        await write(tx, copy.id);
      });

    const messages = await Promise.all([
      frozenError((tx, id) =>
        tx
          .update(surveyQuestionnaire)
          .set({ serial: `${published.code}-999999` })
          .where(eq(surveyQuestionnaire.id, id)),
      ),
      frozenError(async (tx, id) => {
        await tx
          .update(surveyQuestionnaire)
          .set({ status: "VOID" })
          .where(eq(surveyQuestionnaire.id, id));
        await tx
          .update(surveyQuestionnaire)
          .set({ status: "ISSUED" })
          .where(eq(surveyQuestionnaire.id, id));
      }),
      frozenError((tx, id) =>
        tx
          .update(surveyQuestionnairePage)
          .set({ pageNumber: 1 })
          .where(eq(surveyQuestionnairePage.questionnaireId, id)),
      ),
      frozenError((tx) =>
        tx
          .update(surveyPrintRun)
          .set({ copyCount: 2 })
          .where(eq(surveyPrintRun.versionId, published.versionId)),
      ),
    ]).then((errors) => errors.map((e) => e?.message));
    expect(messages).toEqual([
      expect.stringMatching(/only its status can change/),
      expect.stringMatching(/is void, and stays void/),
      expect.stringMatching(/does not change/),
      expect.stringMatching(/only its status can change/),
    ]);

    expect(
      await errorOf(async (tx) => {
        const copy = await oneCopy(tx, published.versionId);
        await tx
          .update(surveyQuestionnaire)
          .set({ status: "VOID" })
          .where(eq(surveyQuestionnaire.id, copy.id));
      }),
    ).toBeNull();
  });
});
