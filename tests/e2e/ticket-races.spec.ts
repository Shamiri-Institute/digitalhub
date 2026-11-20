import { and, eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketEvents, tickets } from "#/db/schema";
import { expect, test, type Undo } from "#/tests/fixtures";
import {
  raceOnRow,
  required,
  signableMember,
  signInWithEmail,
  uniqueSuffix,
} from "#/tests/helpers";
import { getUrl, searchRows } from "#/tests/pages/helpers";
import { fillAction, openTicket } from "#/tests/pages/tickets";

type Fixture = { supervisorEmail: string; supervisorUserId: string; fellowUserId: string };

// A supervisor, a fellow they supervise, and a hub coordinator of the supervisor's hub to escalate to.
async function pickSupervisor() {
  const {
    rows: [row],
  } = await db.execute<Fixture>(sql`
    select su.email as "supervisorEmail", su.id as "supervisorUserId", fm.user_id as "fellowUserId"
    from supervisors sv
    join implementer_members m on m.identifier = sv.id and m.role = 'SUPERVISOR'
    join users su on su.id = m.user_id
    join fellows f on f.supervisor_id = sv.id
    join implementer_members fm on fm.identifier = f.id and fm.role = 'FELLOW'
    where ${signableMember()}
      and exists (select 1 from hub_coordinators hc
        join implementer_members hm on hm.identifier = hc.id and hm.role = 'HUB_COORDINATOR'
        where hc.assigned_hub_id = sv.hub_id and hm.implementer_id = m.implementer_id)
    order by su.email desc, f.id
    limit 1`);
  return row;
}

/** A ticket the fellow raised and escalated to the supervisor, who can escalate or resolve it. */
async function createEscalatedTicket(fixture: Fixture, undo: Undo, subject: string) {
  const [ticket] = await db
    .insert(tickets)
    .values({
      createdById: fixture.fellowUserId,
      subject,
      description: "Raised by the ticket specs.",
      category: "TECH",
      holderId: fixture.supervisorUserId,
      status: "ESCALATED",
    })
    .returning({ id: tickets.id });
  required(ticket, "the escalated ticket");
  // A test that fails mid-write leaves the write to land after it; locking the ticket first waits
  // for that write and the row it adds.
  undo(() =>
    db.transaction(async (tx) => {
      await tx
        .select({ id: tickets.id })
        .from(tickets)
        .where(eq(tickets.id, ticket.id))
        .for("update");
      await tx.delete(ticketEvents).where(eq(ticketEvents.ticketId, ticket.id));
      await tx.delete(tickets).where(eq(tickets.id, ticket.id));
    }),
  );
  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    kind: "CREATED",
    actorId: fixture.fellowUserId,
    assigneeId: fixture.supervisorUserId,
    reason: "Raised by the ticket specs.",
  });
  return ticket;
}

test("escalating and resolving a ticket at once lets only the first one through", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickSupervisor();
  required(fixture, "a supervisor with a fellow and a hub coordinator");
  const subject = `E2E ticket race ${uniqueSuffix()}`;
  const ticket = await createEscalatedTicket(fixture, undo, subject);

  await signInWithEmail(context, fixture.supervisorEmail);
  await openTicket(page, "/sc/tickets", subject);
  const escalate = await fillAction(page, "Escalate", "Needs the hub coordinator.");
  const otherTab = await context.newPage();
  await openTicket(otherTab, "/sc/tickets", subject);
  const resolve = await fillAction(otherTab, "Resolve", "Sorted out.");

  await raceOnRow("tickets", ticket.id, async (waitForWaiting) => {
    await escalate.getByRole("button", { name: "Escalate" }).click();
    await waitForWaiting(1);
    await resolve.getByRole("button", { name: "Resolve" }).click();
    await waitForWaiting(2);
  });

  await expect(page.getByText("Escalation created successfully").first()).toBeVisible();
  await expect(
    otherTab.getByText("Only the ticket's current holder can resolve it").first(),
  ).toBeVisible();
  await page.goto(getUrl("/sc/tickets"));
  await expect(await searchRows(page, subject)).toContainText(/escalated/i);
  // The database is the reliable place to see that the refused resolution was not stored.
  expect(
    await db.$count(
      ticketEvents,
      and(eq(ticketEvents.ticketId, ticket.id), eq(ticketEvents.kind, "RESOLVED")),
    ),
  ).toBe(0);
});
