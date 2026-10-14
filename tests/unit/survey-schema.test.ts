// @vitest-environment node
import { eq, sql, TransactionRollbackError } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { db, pool, type Transaction } from "#/db/client";
import { survey, surveyAuditEvent, surveyPage, surveyQuestion, surveyVersion } from "#/db/schema";

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

/** A survey with one version holding one page and one question, in the given version status. */
async function createSurvey(tx: Transaction, status: "DRAFT" | "PUBLISHED" = "DRAFT") {
  const member = await tx.query.implementerMember.findFirst({
    where: (m, { eq }) => eq(m.role, "RESEARCH"),
    orderBy: (m, { asc }) => asc(m.id),
  });
  const project = await tx.query.project.findFirst({ where: (p, { eq }) => eq(p.isDefault, true) });
  if (!member || !project) throw new Error("The seed has no research user or default project");

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
      .values({ surveyId: created.id, versionNumber: 1, createdBy: member.userId })
      .returning(),
  );
  const page = only(
    await tx.insert(surveyPage).values({ versionId: version.id, position: 1 }).returning(),
  );
  const question = only(
    await tx
      .insert(surveyQuestion)
      .values({
        versionId: version.id,
        pageId: page.id,
        position: 1,
        key: "q1",
        type: "SHORT_TEXT",
        prompt: "Name",
        config: { maxLength: 20 },
      })
      .returning(),
  );
  if (status === "PUBLISHED") {
    await tx
      .update(surveyVersion)
      .set({ status: "PUBLISHED" })
      .where(eq(surveyVersion.id, version.id));
  }
  return {
    survey: created,
    version,
    page,
    question,
    userId: member.userId,
  };
}

describe("survey versions", () => {
  it("accepts pages and questions while the version is a draft", async () => {
    const error = await errorOf(async (tx) => {
      const { version, page } = await createSurvey(tx);
      await tx.insert(surveyPage).values({ versionId: version.id, position: 2 });
      await tx
        .update(surveyQuestion)
        .set({ prompt: "Full name" })
        .where(eq(surveyQuestion.pageId, page.id));
    });
    expect(error).toBeNull();
  });

  it("rejects a page added to a published version", async () => {
    const error = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx, "PUBLISHED");
      await tx.insert(surveyPage).values({ versionId: version.id, position: 2 });
    });
    expect(error).toMatch(/belongs to a PUBLISHED version, which cannot change/);
  });

  it("rejects editing or deleting a question of a published version", async () => {
    const editError = await errorOf(async (tx) => {
      const { question } = await createSurvey(tx, "PUBLISHED");
      await tx
        .update(surveyQuestion)
        .set({ prompt: "Changed" })
        .where(eq(surveyQuestion.id, question.id));
    });
    expect(editError).toMatch(/belongs to a PUBLISHED version, which cannot change/);

    const deleteError = await errorOf(async (tx) => {
      const { question } = await createSurvey(tx, "PUBLISHED");
      await tx.delete(surveyQuestion).where(eq(surveyQuestion.id, question.id));
    });
    expect(deleteError).toMatch(/belongs to a PUBLISHED version, which cannot change/);
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
    expect(reopenError).toMatch(/cannot go from PUBLISHED to DRAFT/);
  });

  it("only lets a draft be published, never retired straight away", async () => {
    const error = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx);
      await tx
        .update(surveyVersion)
        .set({ status: "RETIRED" })
        .where(eq(surveyVersion.id, version.id));
    });
    expect(error).toMatch(/cannot go from DRAFT to RETIRED/);
  });

  it("keeps a version's survey and number, even while it is a draft", async () => {
    const error = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx);
      await tx
        .update(surveyVersion)
        .set({ versionNumber: 7 })
        .where(eq(surveyVersion.id, version.id));
    });
    expect(error).toMatch(/cannot change its survey, number or source version/);
  });

  it("rejects deleting a published version on its own", async () => {
    const error = await errorOf(async (tx) => {
      const { version } = await createSurvey(tx, "PUBLISHED");
      await tx.delete(surveyVersion).where(eq(surveyVersion.id, version.id));
    });
    expect(error).toMatch(/is PUBLISHED, so it can only be deleted with its survey/);
  });

  it("rejects a second draft of the same survey", async () => {
    const error = await errorOf(async (tx) => {
      const { survey, userId } = await createSurvey(tx);
      await tx
        .insert(surveyVersion)
        .values({ surveyId: survey.id, versionNumber: 2, createdBy: userId });
    });
    expect(error).toMatch(/survey_versions_one_draft_per_survey_key/);
  });

  it("rejects a question whose page belongs to another version", async () => {
    const error = await errorOf(async (tx) => {
      const first = await createSurvey(tx);
      const second = await createSurvey(tx);
      await tx.insert(surveyQuestion).values({
        versionId: first.version.id,
        pageId: second.page.id,
        position: 2,
        key: "q2",
        type: "SHORT_TEXT",
        prompt: "Mixed",
        config: { maxLength: 20 },
      });
    });
    expect(error).toMatch(/survey_questions_page_id_version_id_fkey/);
  });

  it("deletes a survey together with its published versions, pages and questions", async () => {
    const error = await errorOf(async (tx) => {
      const { survey: created, question } = await createSurvey(tx, "PUBLISHED");
      await tx.delete(survey).where(eq(survey.id, created.id));
      const left = await tx.query.surveyQuestion.findFirst({
        where: (q, { eq }) => eq(q.id, question.id),
      });
      expect(left).toBeUndefined();
    });
    expect(error).toBeNull();
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
