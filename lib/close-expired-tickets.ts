import { and, eq, lte } from "drizzle-orm";

import { db, type Transaction } from "#/db/client";
import { ticketEvents, tickets } from "#/db/schema";
import { REOPEN_WINDOW_MS } from "#/lib/ticket-reopen-window";

export async function closeExpiredTickets(executor: typeof db | Transaction = db) {
  const now = new Date();
  return executor.transaction(async (tx) => {
    const closedTicketIds = await tx
      .update(tickets)
      .set({ status: "CLOSED", closedAt: now })
      .where(
        and(
          eq(tickets.status, "RESOLVED"),
          lte(tickets.resolvedAt, new Date(now.getTime() - REOPEN_WINDOW_MS)),
        ),
      )
      .returning({ id: tickets.id });
    if (closedTicketIds.length > 0) {
      await tx.insert(ticketEvents).values(
        closedTicketIds.map(({ id }) => ({
          ticketId: id,
          actorId: null,
          kind: "CLOSED" as const,
          fromValue: "RESOLVED",
          toValue: "CLOSED",
        })),
      );
    }
    return closedTicketIds.length;
  });
}
