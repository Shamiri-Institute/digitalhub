import type { Page } from "@playwright/test";
import { eq, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketEvents, tickets } from "#/db/schema";
import { REOPEN_WINDOW_MS } from "#/lib/ticket-reopen-window";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail, uniqueSuffix } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

type FellowAndSupervisor = {
  fellowEmail: string;
  fellowUserId: string;
  supervisorEmail: string;
  supervisorUserId: string;
};

// A fellow who raises the ticket and the supervisor who holds it, both able to sign in.
async function pickFellowAndSupervisor() {
  const {
    rows: [fellowAndSupervisor],
  } = await db.execute<FellowAndSupervisor>(sql`
    select fu.email as "fellowEmail", fu.id as "fellowUserId",
      su.email as "supervisorEmail", su.id as "supervisorUserId"
    from fellows f
    join implementer_members m on m.identifier = f.id and m.role = 'FELLOW'
    join users fu on fu.id = m.user_id
    join supervisors sv on sv.id = f.supervisor_id
    join implementer_members sm on sm.identifier = sv.id and sm.role = 'SUPERVISOR'
      and ${signableMember("sm")}
    join users su on su.id = sm.user_id
    where ${signableMember()}
    order by fu.email
    limit 1`);
  return fellowAndSupervisor;
}

async function insertHeldTicket(fellowAndSupervisor: FellowAndSupervisor, undo: Undo) {
  const ticketSubject = `E2E ticket lifecycle ${uniqueSuffix()}`;
  const [ticket] = await db
    .insert(tickets)
    .values({
      createdById: fellowAndSupervisor.fellowUserId,
      subject: ticketSubject,
      description: "Raised by the ticket lifecycle spec.",
      category: "TECH",
      holderId: fellowAndSupervisor.supervisorUserId,
    })
    .returning({ id: tickets.id });
  required(ticket, "the spec's ticket");
  undo(async () => {
    await db.delete(ticketEvents).where(eq(ticketEvents.ticketId, ticket.id));
    await db.delete(tickets).where(eq(tickets.id, ticket.id));
  });
  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    kind: "CREATED",
    actorId: fellowAndSupervisor.fellowUserId,
    assigneeId: fellowAndSupervisor.supervisorUserId,
    reason: "Raised by the ticket lifecycle spec.",
  });
  return { ticketId: ticket.id, ticketSubject };
}

async function giveReason(page: Page, title: string, reason: string) {
  const dialog = page.getByRole("dialog", { name: title });
  await dialog.getByLabel("Reason").fill(reason);
  await dialog.getByRole("button", { name: title }).click();
  await expect(dialog).toBeHidden();
}

async function expectRowAfterReload(page: Page, ticketSubject: string, text: RegExp) {
  await page.reload();
  await expect(await searchRows(page, ticketSubject)).toContainText(text);
}

async function expectNoActions(page: Page, ticketSubject: string, actions: string[]) {
  await (await searchRows(page, ticketSubject)).getByRole("cell").last().click();
  const menu = page.getByRole("menu");
  // The actions arrive with a status request the menu makes as it opens.
  await expect(menu.getByText("View ticket")).toBeVisible();
  await page.waitForLoadState("networkidle");
  for (const action of actions)
    await expect(menu.getByText(action, { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
}

test("the holder starts, reprioritises and resolves a ticket, and its creator reopens it", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);

  await signInWithEmail(context, fellowAndSupervisor.supervisorEmail);
  await page.goto(getUrl("/sc/tickets"));
  await expect(await searchRows(page, ticketSubject)).toContainText(/open/i);
  await chooseRowAction(page, await searchRows(page, ticketSubject), "Start ticket");
  await expect(page.getByText("Ticket started").first()).toBeVisible();
  await expectRowAfterReload(page, ticketSubject, /in progress/i);

  await chooseRowAction(page, await searchRows(page, ticketSubject), "Change priority");
  await page.getByRole("dialog", { name: "Change priority" }).getByRole("combobox").click();
  await page.getByRole("option", { name: "URGENT" }).click();
  await giveReason(page, "Change priority", "A whole school is affected.");
  await expectRowAfterReload(page, ticketSubject, /urgent/i);

  await chooseRowAction(page, await searchRows(page, ticketSubject), "Resolve ticket");
  const resolve = page.getByRole("dialog", { name: "Resolve Ticket" });
  await resolve.getByRole("combobox").click();
  await page.getByRole("option", { name: "Yes" }).click();
  await resolve.getByPlaceholder("Explain how this ticket was resolved").fill("Sorted out.");
  await resolve.getByRole("button", { name: "Resolve Ticket" }).click();
  await expect(resolve).toBeHidden();
  await expectRowAfterReload(page, ticketSubject, /resolved/i);

  await signInWithEmail(context, fellowAndSupervisor.fellowEmail);
  await page.goto(getUrl("/fel/tickets"));
  await chooseRowAction(page, await searchRows(page, ticketSubject), "Reopen ticket");
  await giveReason(page, "Reopen ticket", "The device still drops the connection.");
  await expectRowAfterReload(page, ticketSubject, /in progress/i);

  await chooseRowAction(page, await searchRows(page, ticketSubject), "View ticket");
  const details = page.getByRole("dialog", { name: "Ticket Details" });
  await expect(details).toContainText("Priority changed from medium to urgent");
  await expect(details).toContainText("A whole school is affected.");
  await expect(details).toContainText("Reopened");
  await expect(details).toContainText("The device still drops the connection.");
});

test("the creator cancels an open ticket with a reason", async ({ page, context, undo }) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);

  await signInWithEmail(context, fellowAndSupervisor.fellowEmail);
  await page.goto(getUrl("/fel/tickets"));
  await chooseRowAction(page, await searchRows(page, ticketSubject), "Cancel ticket");
  await giveReason(page, "Cancel ticket", "Raised by mistake.");
  await expectRowAfterReload(page, ticketSubject, /cancelled/i);
  await expectNoActions(page, ticketSubject, ["Cancel ticket", "Reopen ticket"]);

  await signInWithEmail(context, fellowAndSupervisor.supervisorEmail);
  await page.goto(getUrl("/sc/tickets"));
  await expectNoActions(page, ticketSubject, [
    "Start ticket",
    "Change priority",
    "Resolve ticket",
    "Escalate ticket",
    "Reassign ticket",
  ]);

  await chooseRowAction(page, await searchRows(page, ticketSubject), "View ticket");
  const details = page.getByRole("dialog", { name: "Ticket Details" });
  await expect(details).toContainText("Cancelled");
  await expect(details).toContainText("Raised by mistake.");
});

test("the creator can't reopen a ticket once the reopen window has passed", async ({
  page,
  context,
  undo,
}) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketId, ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);
  // Resolved just past the window, so the hourly close has not run yet and only the window guards it.
  await db
    .update(tickets)
    .set({ status: "RESOLVED", resolvedAt: new Date(Date.now() - REOPEN_WINDOW_MS - 60_000) })
    .where(eq(tickets.id, ticketId));

  await signInWithEmail(context, fellowAndSupervisor.fellowEmail);
  await page.goto(getUrl("/fel/tickets"));
  await expectNoActions(page, ticketSubject, ["Reopen ticket", "Cancel ticket"]);
});

test("the creator can cancel a clinical ticket only until it is started", async ({
  page,
  context,
  undo,
}) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketId, ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);
  await db.update(tickets).set({ category: "CLINICAL" }).where(eq(tickets.id, ticketId));

  await signInWithEmail(context, fellowAndSupervisor.fellowEmail);
  await page.goto(getUrl("/fel/tickets"));
  await (await searchRows(page, ticketSubject)).getByRole("cell").last().click();
  await expect(page.getByRole("menu").getByText("Cancel ticket", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  await db.update(tickets).set({ status: "IN_PROGRESS" }).where(eq(tickets.id, ticketId));
  await page.reload();
  await expectNoActions(page, ticketSubject, ["Cancel ticket"]);
});
