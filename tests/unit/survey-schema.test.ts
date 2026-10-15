// @vitest-environment node
// The survey triggers (drizzle/0023) refuse writes the app must never make: changing a published
// version's form, moving a version's status backwards, rewriting audit
// history. No screen can attempt these writes, so these tests attempt them against the database
// and expect the refusal; everything a user can do is tested through the UI in
// tests/e2e/admin-surveys.spec.ts. Same approach as membership-identifier.test.ts for 0014.
import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool, type Transaction } from "#/db/client";
import { survey, surveyAuditEvent, surveyVersion } from "#/db/schema";
import type { SurveyForm } from "#/lib/survey/form";

/** The single row an insert returned. */
function only<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) throw new Error("The insert returned no row");
  return row;
}

afterAll(() => pool.end());

// Runs the write in a transaction that is always rolled back, and returns the database error it
// raised, or null.
async function errorOf(write: (tx: Transaction) => Promise<unknown>) {
  try {
    await db.transaction(async (tx) => {
      await write(tx);
      tx.rollback();
    });
  } catch (error) {
    if (error instanceof TransactionRollbackError) return null;
    return error instanceof Error && error.cause instanceof Error ? error.cause.message : error;
  }
  return null;
}

const ONE_QUESTION: SurveyForm = {
  format: 1,
  pages: [
    {
      items: [{ id: "name", kind: "text", key: "name", prompt: "Name", required: true, lines: 1 }],
    },
  ],
};

/**
 * A survey with one version whose form has one page and one question, in the given status. Built
 * with direct inserts because there is no builder or publish screen yet to make a published
 * version; switch to those flows once they exist.
 */
async function createSurvey(tx: Transaction, status: "DRAFT" | "PUBLISHED" = "DRAFT") {
  const member = await tx.query.implementerMember.findFirst({
    where: (m, { eq }) => eq(m.role, "ADMIN"),
    orderBy: (m, { asc }) => asc(m.id),
  });
  const project = await tx.query.project.findFirst({ where: (p, { eq }) => eq(p.isDefault, true) });
  if (!member || !project) throw new Error("The seed has no admin or default project");

  const created = only(
    await tx
      .insert(survey)
      .values({
        implementerId: member.implementerId,
        projectId: project.id,
        code: `T${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        title: "Schema test",
        createdBy: member.userId,
      })
      .returning(),
  );
  const version = only(
    await tx
      .insert(surveyVersion)
      .values({
        surveyId: created.id,
        versionNumber: 1,
        createdBy: member.userId,
        form: ONE_QUESTION,
      })
      .returning(),
  );
  if (status === "PUBLISHED") {
    await tx
      .update(surveyVersion)
      .set({ status: "PUBLISHED" })
      .where(eq(surveyVersion.id, version.id));
  }
  return { survey: created, version, userId: member.userId };
}

describe("survey versions", () => {
  it("rejects changing the form of a published version", async () => {
    const error = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx, "PUBLISHED");
      await tx
        .update(surveyVersion)
        .set({ form: { format: 1, pages: [] } })
        .where(eq(surveyVersion.id, version.id));
    });
    expect(error).toMatch(/cannot change from PUBLISHED to PUBLISHED/);
  });

  it("lets a published version be retired, but never reopened", async () => {
    const retireError = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx, "PUBLISHED");
      await tx
        .update(surveyVersion)
        .set({ status: "RETIRED" })
        .where(eq(surveyVersion.id, version.id));
    });
    expect(retireError).toBeNull();

    const reopenError = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx, "PUBLISHED");
      await tx
        .update(surveyVersion)
        .set({ status: "DRAFT" })
        .where(eq(surveyVersion.id, version.id));
    });
    expect(reopenError).toMatch(/cannot change from PUBLISHED to DRAFT/);
  });

  it("only lets a draft be published, never retired straight away", async () => {
    const error = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx);
      await tx
        .update(surveyVersion)
        .set({ status: "RETIRED" })
        .where(eq(surveyVersion.id, version.id));
    });
    expect(error).toMatch(/cannot change from DRAFT to RETIRED/);
  });

  it("keeps a version's survey and number, even while it is a draft", async () => {
    const error = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx);
      await tx
        .update(surveyVersion)
        .set({ versionNumber: 7 })
        .where(eq(surveyVersion.id, version.id));
    });
    expect(error).toMatch(/cannot change from DRAFT to DRAFT/);
  });

  it("rejects a version created as anything but a draft", async () => {
    const error = await errorOf(async (tx) => {
      const { survey, userId } = await createSurvey(tx, "PUBLISHED");
      await tx.insert(surveyVersion).values({
        surveyId: survey.id,
        versionNumber: 2,
        status: "PUBLISHED",
        createdBy: userId,
        form: ONE_QUESTION,
      });
    });
    expect(error).toMatch(/must be created as a DRAFT, not PUBLISHED/);
  });

  it("rejects deleting a published version on its own", async () => {
    const error = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx, "PUBLISHED");
      await tx.delete(surveyVersion).where(eq(surveyVersion.id, version.id));
    });
    expect(error).toMatch(/is PUBLISHED, so it can only be deleted with its survey/);
  });
});

describe("survey_audit_events", () => {
  it("rejects updating or deleting an event", async () => {
    const insertEvent = (tx: Transaction) =>
      tx
        .insert(surveyAuditEvent)
        .values({
          actorKind: "SYSTEM",
          entityType: "SURVEY",
          entityId: "survey_test",
          action: "SURVEY_CREATED",
        })
        .returning({ id: surveyAuditEvent.id });

    const updateError = await errorOf(async (tx) => {
      const event = only(await insertEvent(tx));
      await tx
        .update(surveyAuditEvent)
        .set({ reason: "rewritten" })
        .where(eq(surveyAuditEvent.id, event.id));
    });
    expect(updateError).toMatch(/append-only; UPDATE is not allowed/);

    const deleteError = await errorOf(async (tx) => {
      const event = only(await insertEvent(tx));
      await tx.delete(surveyAuditEvent).where(eq(surveyAuditEvent.id, event.id));
    });
    expect(deleteError).toMatch(/append-only; DELETE is not allowed/);
  });

  it("requires a user for a USER event and none otherwise", async () => {
    const error = await errorOf((tx) =>
      tx.execute(sql`insert into survey_audit_events (actor_kind, entity_type, entity_id, action)
        values ('USER', 'SURVEY', 'survey_test', 'SURVEY_CREATED')`),
    );
    expect(error).toMatch(/survey_audit_events_actor_check/);
  });
});
