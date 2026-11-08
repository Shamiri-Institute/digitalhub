import type { Page } from "@playwright/test";
import { eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketEscalations, ticketResolutions, tickets } from "#/db/schema";
import { expect, test, type Undo } from "#/tests/fixtures";
import {
  expectOpenUntilWritten,
  raceOnRow,
  required,
  signableMember,
  signInWithEmail,
} from "#/tests/helpers";
import { cellUnder, chooseRowAction, getUrl, searchRows } from "#/tests/pages/helpers";

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
      status: "ESCALATED",
    })
    .returning({ id: tickets.id });
  required(ticket, "the escalated ticket");
  undo(async () => {
    await db.delete(ticketResolutions).where(eq(ticketResolutions.ticketId, ticket.id));
    await db.delete(ticketEscalations).where(eq(ticketEscalations.ticketId, ticket.id));
    await db.delete(tickets).where(eq(tickets.id, ticket.id));
  });
  await db.insert(ticketEscalations).values({
    ticketId: ticket.id,
    escalatedById: fixture.fellowUserId,
    escalatedToId: fixture.supervisorUserId,
    escalationReason: "Raised by the ticket specs.",
  });
  return ticket;
}

async function openTicketAction(page: Page, subject: string, action: string) {
  await page.goto(getUrl("/sc/tickets"));
  await chooseRowAction(page, await searchRows(page, subject), action);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Yes" }).click();
  return dialog;
}

test("escalating and resolving a ticket at once lets only the first one through", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fixture = await pickSupervisor();
  required(fixture, "a supervisor with a fellow and a hub coordinator");
  const subject = `E2E ticket race ${Date.now()}`;
  const ticket = await createEscalatedTicket(fixture, undo, subject);

  await signInWithEmail(context, fixture.supervisorEmail);
  const escalate = await openTicketAction(page, subject, "Escalate ticket");
  await escalate
    .getByPlaceholder("Explain why this ticket needs to be escalated")
    .fill("Needs the hub coordinator.");
  const otherTab = await context.newPage();
  const resolve = await openTicketAction(otherTab, subject, "Resolve ticket");
  await resolve.getByPlaceholder("Explain how this ticket was resolved").fill("Sorted out.");

  await raceOnRow("tickets", ticket.id, async (waitForWaiting) => {
    await escalate.getByRole("button", { name: "Escalate Ticket" }).click();
    await waitForWaiting(1);
    await resolve.getByRole("button", { name: "Resolve Ticket" }).click();
    await waitForWaiting(2);
  });

  await expect(page.getByText("Ticket escalated successfully").first()).toBeVisible();
  await expect(
    otherTab.getByText("Only the current escalation recipient can resolve this ticket").first(),
  ).toBeVisible();
  await page.reload();
  const row = await searchRows(page, subject);
  // The table lowercases the status through CSS.
  await expect(row).toContainText(/escalated/i);
  // The ticket's menu offers "View resolution" only after a status request it makes on opening, so
  // the database is the reliable place to see that the refused resolution was not stored.
  expect(await db.$count(ticketResolutions, eq(ticketResolutions.ticketId, ticket.id))).toBe(0);
});

test("the resolve dialog stays open until the resolution is saved", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickSupervisor();
  required(fixture, "a supervisor with a fellow and a hub coordinator");
  const subject = `E2E ticket resolve dialog ${Date.now()}`;
  const ticket = await createEscalatedTicket(fixture, undo, subject);
  await signInWithEmail(context, fixture.supervisorEmail);

  const resolve = await openTicketAction(page, subject, "Resolve ticket");
  await resolve.getByPlaceholder("Explain how this ticket was resolved").fill("Sorted out.");
  await expectOpenUntilWritten(
    page,
    resolve,
    resolve.getByRole("button", { name: "Resolve Ticket" }),
    {
      table: "tickets",
      id: ticket.id,
    },
  );
  await page.reload();
  await expect(await searchRows(page, subject)).toContainText(/resolved/i);
});

test("the escalate dialog stays open until the escalation is saved", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickSupervisor();
  required(fixture, "a supervisor with a fellow and a hub coordinator");
  const subject = `E2E ticket escalate dialog ${Date.now()}`;
  const ticket = await createEscalatedTicket(fixture, undo, subject);
  await signInWithEmail(context, fixture.supervisorEmail);

  const escalate = await openTicketAction(page, subject, "Escalate ticket");
  await escalate
    .getByPlaceholder("Explain why this ticket needs to be escalated")
    .fill("Needs the hub coordinator.");
  await expectOpenUntilWritten(
    page,
    escalate,
    escalate.getByRole("button", { name: "Escalate Ticket" }),
    { table: "tickets", id: ticket.id },
  );
  await page.reload();
  await expect(await cellUnder(page, await searchRows(page, subject), "Current Tier")).toHaveText(
    "hub coordinator",
  );
});

test("the new ticket dialog stays open until the ticket is saved", async ({
  page,
  context,
  undo,
}) => {
  const fixture = await pickSupervisor();
  required(fixture, "a supervisor with a fellow and a hub coordinator");
  const subject = `E2E new ticket dialog ${Date.now()}`;
  undo(async () => {
    const created = db.select({ id: tickets.id }).from(tickets).where(eq(tickets.subject, subject));
    await db.delete(ticketEscalations).where(inArray(ticketEscalations.ticketId, created));
    await db.delete(tickets).where(eq(tickets.subject, subject));
  });
  await signInWithEmail(context, fixture.supervisorEmail);

  await page.goto(getUrl("/sc/tickets"));
  await page.getByRole("button", { name: "New ticket" }).click();
  const dialog = page.getByRole("dialog", { name: "Create new ticket" });
  await dialog.getByPlaceholder("Enter ticket subject").fill(subject);
  await dialog.getByPlaceholder("Describe the issue").fill("Raised by the new ticket dialog spec.");
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "TECH" }).click();
  // The new ticket names its creator, so locking the creator's user row holds its insert.
  await expectOpenUntilWritten(page, dialog, dialog.getByRole("button", { name: "Submit" }), {
    table: "users",
    id: fixture.supervisorUserId,
  });
  await page.reload();
  await expect(await searchRows(page, subject)).toBeVisible();
});
