// @vitest-environment node
import { inArray, TransactionRollbackError } from "drizzle-orm";
import { expect, it } from "vitest";

import { db } from "#/db/client";
import { ticketEvents, tickets } from "#/db/schema";
import { closeExpiredTickets } from "#/lib/close-expired-tickets";
import { REOPEN_WINDOW_MS } from "#/lib/ticket-reopen-window";

it("closes resolved tickets past the reopen window and leaves the rest", async () => {
  const creator = await db.query.user.findFirst({ columns: { id: true } });
  if (!creator) throw new Error("The seed has no users");
  const resolvedAgo = (ms: number) => ({
    createdById: creator.id,
    subject: "Close expired tickets test",
    description: "Rolled back by the test.",
    category: "TECH" as const,
    holderId: creator.id,
    status: "RESOLVED" as const,
    resolvedAt: new Date(Date.now() - ms),
  });

  // The transaction is rolled back, so the seed's own tickets are never closed.
  await db
    .transaction(async (tx) => {
      const [expired, recent] = await tx
        .insert(tickets)
        .values([resolvedAgo(REOPEN_WINDOW_MS + 60_000), resolvedAgo(60_000)])
        .returning({ id: tickets.id });
      if (!expired || !recent) throw new Error("Ticket insert returned no rows");

      await closeExpiredTickets(tx);

      const statusOf = async (id: string) =>
        tx.query.tickets.findFirst({
          where: (t, { eq }) => eq(t.id, id),
          columns: { status: true, closedAt: true },
        });
      expect(await statusOf(expired.id)).toMatchObject({
        status: "CLOSED",
        closedAt: expect.any(Date),
      });
      expect(await statusOf(recent.id)).toEqual({ status: "RESOLVED", closedAt: null });

      const events = await tx
        .select({
          ticketId: ticketEvents.ticketId,
          actorId: ticketEvents.actorId,
          kind: ticketEvents.kind,
        })
        .from(ticketEvents)
        .where(inArray(ticketEvents.ticketId, [expired.id, recent.id]));
      expect(events).toEqual([{ ticketId: expired.id, actorId: null, kind: "CLOSED" }]);
      tx.rollback();
    })
    .catch((error: unknown) => {
      if (!(error instanceof TransactionRollbackError)) throw error;
    });
});
