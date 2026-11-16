import type { Page } from "@playwright/test";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { ticketEvents, tickets } from "#/db/schema";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
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
  const ticketSubject = `E2E ticket lifecycle ${Date.now()}`;
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
  const { ticketId, ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);

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

  // No page shows the event log, so the database is where the logged reasons can be seen.
  const lifecycleEvents = await db
    .select({ kind: ticketEvents.kind, reason: ticketEvents.reason })
    .from(ticketEvents)
    .where(
      and(
        eq(ticketEvents.ticketId, ticketId),
        inArray(ticketEvents.kind, ["STARTED", "PRIORITY_CHANGED", "REOPENED"]),
      ),
    )
    .orderBy(ticketEvents.createdAt);
  expect(lifecycleEvents).toEqual([
    { kind: "STARTED", reason: null },
    { kind: "PRIORITY_CHANGED", reason: "A whole school is affected." },
    { kind: "REOPENED", reason: "The device still drops the connection." },
  ]);
});

test("the creator cancels an open ticket with a reason", async ({ page, context, undo }) => {
  const fellowAndSupervisor = await pickFellowAndSupervisor();
  required(fellowAndSupervisor, "a fellow and their supervisor who can both sign in");
  const { ticketId, ticketSubject } = await insertHeldTicket(fellowAndSupervisor, undo);

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

  const [cancellation] = await db
    .select({ reason: ticketEvents.reason })
    .from(ticketEvents)
    .where(and(eq(ticketEvents.ticketId, ticketId), eq(ticketEvents.kind, "CANCELLED")));
  expect(cancellation?.reason).toBe("Raised by mistake.");
});
