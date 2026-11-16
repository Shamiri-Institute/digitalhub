// @vitest-environment node
import { and, eq, inArray, isNotNull, notExists } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";

import { db, serializableTransaction, type Transaction } from "#/db/client";
import {
  fellowAttendance,
  interventionGroup,
  interventionSession,
  payoutStatements,
  user,
} from "#/db/schema";
import { objectId } from "#/lib/crypto";

const createdAttendanceIds: number[] = [];

afterEach(async () => {
  const ids = createdAttendanceIds.splice(0);
  if (ids.length === 0) return;
  await db.delete(payoutStatements).where(inArray(payoutStatements.fellowAttendanceId, ids));
  await db.delete(fellowAttendance).where(inArray(fellowAttendance.id, ids));
});

/** Two fellows' unmarked attendance at occurred sessions, in different sessions. */
async function twoUnmarkedAttendances() {
  const slots = await db
    .select({
      fellowId: interventionGroup.leaderId,
      groupId: interventionGroup.id,
      sessionId: interventionSession.id,
    })
    .from(interventionGroup)
    .innerJoin(
      interventionSession,
      and(
        eq(interventionSession.schoolId, interventionGroup.schoolId),
        eq(interventionSession.occurred, true),
      ),
    )
    .where(
      notExists(
        db
          .select({ id: fellowAttendance.id })
          .from(fellowAttendance)
          .where(
            and(
              eq(fellowAttendance.fellowId, interventionGroup.leaderId),
              eq(fellowAttendance.sessionId, interventionSession.id),
            ),
          ),
      ),
    )
    .orderBy(interventionGroup.id, interventionSession.id)
    .limit(400);
  const [first] = slots;
  const second = slots.find(
    (slot) => slot.fellowId !== first?.fellowId && slot.sessionId !== first?.sessionId,
  );
  if (!first || !second) throw new Error("seed the database first: two unmarked attendances");
  return [first, second] as const;
}

describe("serializableTransaction", () => {
  it("commits two overlapping attendance marks for different fellows", async () => {
    const [marker] = await db
      .select({ id: user.id })
      .from(user)
      .where(isNotNull(user.email))
      .limit(1);
    if (!marker) throw new Error("seed the database first: a user");
    const slots = await twoUnmarkedAttendances();

    // Each mark reads before either writes, the way two supervisors' saves overlap; Postgres then
    // cancels one of them as a serialization failure.
    let readsDone = 0;
    let releaseWrites = () => {};
    const bothRead = new Promise<void>((resolve) => {
      releaseWrites = resolve;
    });
    const mark = (slot: (typeof slots)[number]) => async (tx: Transaction) => {
      await tx
        .select()
        .from(fellowAttendance)
        .where(
          and(
            eq(fellowAttendance.fellowId, slot.fellowId),
            eq(fellowAttendance.sessionId, slot.sessionId),
          ),
        );
      readsDone += 1;
      if (readsDone === 2) releaseWrites();
      await bothRead;
      const [created] = await tx
        .insert(fellowAttendance)
        .values({ ...slot, attended: true, markedBy: marker.id })
        .returning({ id: fellowAttendance.id });
      if (!created) throw new Error("the attendance was not inserted");
      createdAttendanceIds.push(created.id);
      await tx
        .select()
        .from(payoutStatements)
        .where(eq(payoutStatements.fellowAttendanceId, created.id));
      await tx.insert(payoutStatements).values({
        id: objectId("payout"),
        fellowAttendanceId: created.id,
        amount: 1000,
        reason: "MARK_SESSION_ATTENDANCE",
        createdBy: marker.id,
      });
    };

    const outcomes = await Promise.allSettled(
      slots.map((slot) => serializableTransaction(mark(slot))),
    );

    expect(outcomes.map((outcome) => outcome.status)).toEqual(["fulfilled", "fulfilled"]);
    const stored = await db
      .select({ fellowId: fellowAttendance.fellowId, sessionId: fellowAttendance.sessionId })
      .from(fellowAttendance)
      .where(inArray(fellowAttendance.id, createdAttendanceIds));
    expect(stored).toHaveLength(2);
  });
});
