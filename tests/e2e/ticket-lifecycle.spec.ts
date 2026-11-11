import type { Page } from "@playwright/test";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "#/db/client";
import { implementerMember, supervisor, ticketEvents, tickets, user } from "#/db/schema";
import { objectId } from "#/lib/crypto";
import { expect, test, type Undo } from "#/tests/fixtures";
import { required, signableMember, signInWithEmail } from "#/tests/helpers";
import { getUrl, chooseRowAction, searchRows } from "#/tests/pages/helpers";

type Chain = {
  fellowEmail: string;
  fellowUserId: string;
  supervisorEmail: string;
  supervisorUserId: string;
};

// A fellow who raises the ticket and the supervisor who holds it, both able to sign in.
async function pickFellowAndSupervisor() {
  const {
    rows: [row],
  } = await db.execute<Chain>(sql`
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
  return row;
}

async function insertHeldTicket(chain: Chain, undo: Undo) {
  const ticketSubject = `E2E ticket lifecycle ${Date.now()}`;
  const [ticket] = await db
    .insert(tickets)
    .values({
      createdById: chain.fellowUserId,
      subject: ticketSubject,
      description: "Raised by the ticket lifecycle spec.",
      category: "TECH",
      holderId: chain.supervisorUserId,
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
    actorId: chain.fellowUserId,
    assigneeId: chain.supervisorUserId,
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

// The table renders the status and priority lowercased.
async function expectRowAfterReload(page: Page, ticketSubject: string, text: RegExp) {
  await page.reload();
  await expect(await searchRows(page, ticketSubject)).toContainText(text);
}

test("the holder starts, reprioritises and resolves a ticket, and its creator reopens it", async ({
  page,
  context,
  undo,
}) => {
  test.slow();
  const chain = await pickFellowAndSupervisor();
  required(chain, "a fellow and their supervisor who can both sign in");
  const { ticketId, ticketSubject } = await insertHeldTicket(chain, undo);

  await signInWithEmail(context, chain.supervisorEmail);
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

  await signInWithEmail(context, chain.fellowEmail);
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
  const chain = await pickFellowAndSupervisor();
  required(chain, "a fellow and their supervisor who can both sign in");
  const { ticketId, ticketSubject } = await insertHeldTicket(chain, undo);

  await signInWithEmail(context, chain.fellowEmail);
  await page.goto(getUrl("/fel/tickets"));
  await chooseRowAction(page, await searchRows(page, ticketSubject), "Cancel ticket");
  await giveReason(page, "Cancel ticket", "Raised by mistake.");
  await expectRowAfterReload(page, ticketSubject, /cancelled/i);

  // No page shows the cancellation reason.
  const [cancellation] = await db
    .select({ reason: ticketEvents.reason })
    .from(ticketEvents)
    .where(and(eq(ticketEvents.ticketId, ticketId), eq(ticketEvents.kind, "CANCELLED")));
  expect(cancellation?.reason).toBe("Raised by mistake.");
});

test("a ticket whose resolver has dropped out cannot be reopened", async ({
  page,
  context,
  undo,
}) => {
  const chain = await pickFellowAndSupervisor();
  required(chain, "a fellow and their supervisor who can both sign in");
  const [chainSupervisor] = await db
    .select({ hubId: supervisor.hubId, implementerId: supervisor.implementerId })
    .from(supervisor)
    .innerJoin(
      implementerMember,
      and(
        eq(implementerMember.identifier, supervisor.id),
        eq(implementerMember.role, "SUPERVISOR"),
      ),
    )
    .where(eq(implementerMember.userId, chain.supervisorUserId))
    .limit(1);
  required(chainSupervisor, "the chain supervisor's profile");

  const supervisorId = objectId("sup");
  await db.insert(supervisor).values({
    id: supervisorId,
    supervisorName: `E2E dropped resolver ${Date.now()}`,
    hubId: chainSupervisor.hubId,
    implementerId: chainSupervisor.implementerId,
    droppedOut: true,
    dropOutReason: "Left the programme",
  });
  undo(() => db.delete(supervisor).where(eq(supervisor.id, supervisorId)));
  const [resolver] = await db
    .insert(user)
    .values({ name: "E2E dropped resolver" })
    .returning({ id: user.id });
  required(resolver, "the dropped resolver's user");
  undo(() => db.delete(user).where(eq(user.id, resolver.id)));
  await db.insert(implementerMember).values({
    implementerId: chainSupervisor.implementerId,
    userId: resolver.id,
    role: "SUPERVISOR",
    identifier: supervisorId,
  });
  undo(() => db.delete(implementerMember).where(eq(implementerMember.userId, resolver.id)));

  const { ticketId, ticketSubject } = await insertHeldTicket(
    { ...chain, supervisorUserId: resolver.id },
    undo,
  );
  await db
    .update(tickets)
    .set({ status: "RESOLVED", resolvedAt: new Date() })
    .where(eq(tickets.id, ticketId));

  await signInWithEmail(context, chain.fellowEmail);
  await page.goto(getUrl("/fel/tickets"));
  await chooseRowAction(page, await searchRows(page, ticketSubject), "Reopen ticket");
  const dialog = page.getByRole("dialog", { name: "Reopen ticket" });
  await dialog.getByLabel("Reason").fill("Still broken.");
  await dialog.getByRole("button", { name: "Reopen ticket" }).click();
  await expect(page.getByText("no longer active").first()).toBeVisible();
  await expectRowAfterReload(page, ticketSubject, /resolved/i);
});
