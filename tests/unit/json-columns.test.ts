// @vitest-environment node
import { eq, TransactionRollbackError } from "drizzle-orm";
import { expect, it } from "vitest";

import { db } from "#/db/client";
import { SurveyAuditActor } from "#/db/enums";
import { type JsonValue, surveyAuditEvent } from "#/db/schema";

async function readBack(stored: JsonValue) {
  let readValues: { selected: JsonValue | null; queried: JsonValue | null | undefined } | undefined;
  try {
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(surveyAuditEvent)
        .values({
          actorKind: SurveyAuditActor.SYSTEM,
          entityType: "JSON_COLUMN_TEST",
          entityId: "json-column-test",
          action: "STORED",
          after: stored,
        })
        .returning({ id: surveyAuditEvent.id });
      if (!inserted) throw new Error("The test event was not inserted");
      const [selected] = await tx
        .select({ after: surveyAuditEvent.after })
        .from(surveyAuditEvent)
        .where(eq(surveyAuditEvent.id, inserted.id));
      const queried = await tx.query.surveyAuditEvent.findFirst({
        columns: { after: true },
        where: (event, { eq }) => eq(event.id, inserted.id),
      });
      readValues = { selected: selected?.after ?? null, queried: queried?.after };
      tx.rollback();
    });
  } catch (error) {
    if (!(error instanceof TransactionRollbackError)) throw error;
  }
  return readValues;
}

it.each([
  ["a numeric option code", "1"],
  ["a string that reads as true", "true"],
  ["a string that reads as null", "null"],
  ["a plain string", "a"],
  ["an array of codes", ["0", "3"]],
  ["an object", { code: "2", fill: 0.8 }],
  ["a number", 2],
] satisfies [string, JsonValue][])("reads %s back as it was stored", async (_, stored) => {
  expect(await readBack(stored)).toEqual({ selected: stored, queried: stored });
});
