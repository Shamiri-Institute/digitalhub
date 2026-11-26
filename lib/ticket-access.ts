import { and, eq, exists, or } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketEvents, tickets } from "#/db/schema";

/** Whether the user raised the ticket, acted on it, or was handed it at some point. */
export function canViewTicket(userId: string) {
  return or(
    eq(tickets.createdById, userId),
    exists(
      db
        .select({ id: ticketEvents.id })
        .from(ticketEvents)
        .where(
          and(
            eq(ticketEvents.ticketId, tickets.id),
            or(eq(ticketEvents.actorId, userId), eq(ticketEvents.assigneeId, userId)),
          ),
        ),
    ),
  );
}
